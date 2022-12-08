import { clone, compact, flatten, last } from 'lodash'

import { GraphQLResolveInfo } from "graphql";

import { DataSource, EntityManager } from "typeorm";
import { SoftDeleteQueryBuilder } from "typeorm/query-builder/SoftDeleteQueryBuilder";

import {
    AnyObject,
    DataError,
    FieldBuilderInfo,
    ForbiddenError,
    InvalidInputError, Optional,
    OptionalPromise,
    ResolverInfo
} from "@kiwano/core";

import { Plugin } from "../plugin";
import { ModelType } from "../common";
import {
    getModelPrimaryColumn,
    getModelSelectQuery,
    hooksExecutor,
    ModelMutationResolverHooks,
    throwModelNotFound
} from "./common";

export interface RestoreResolverOptionsPartial {
    plugins?: Plugin[]
}

export interface RestoreResolverOptions extends RestoreResolverOptionsPartial {
    dataSource: DataSource
    model: ModelType
    idArgument: string
    fieldInfo: FieldBuilderInfo
}

export interface RestoreResolverInfo<SourceType> extends ResolverInfo<SourceType> {
    options: RestoreResolverOptions
    id: string
}

export interface RestoreResolverBaseHooks<ModelType, SourceType> extends ModelMutationResolverHooks<ModelType, SourceType> {

    $beforeRestoreResolver?(info: RestoreResolverInfo<SourceType>): OptionalPromise
    $afterRestoreResolver?(result: ModelType | any, info: RestoreResolverInfo<SourceType>): OptionalPromise

    $restoreAllowed?(model: ModelType, info: RestoreResolverInfo<SourceType>): OptionalPromise<boolean>

    $onRestoreNotAllowed?(model: ModelType, info: RestoreResolverInfo<SourceType>): OptionalPromise
    $onRestoreNotFound?(info: RestoreResolverInfo<SourceType>): OptionalPromise
    $onRestoreFailed?(model: ModelType, error: Error, info: RestoreResolverInfo<SourceType>): OptionalPromise

    $transformRestoreResult?(result: ModelType | any, originalResult: ModelType, info: RestoreResolverInfo<SourceType>): OptionalPromise<Optional<ModelType | any>>

    $modifyRestoreQuery?(builder: SoftDeleteQueryBuilder<ModelType>, model: ModelType, entityManager: EntityManager, info: RestoreResolverInfo<SourceType>): OptionalPromise

    $beforeRestoreModel?(model: ModelType, entityManager: EntityManager, info: RestoreResolverInfo<SourceType>): OptionalPromise
    $afterRestoreModel?(model: ModelType, entityManager: EntityManager, info: RestoreResolverInfo<SourceType>): OptionalPromise
}

export interface RestoreResolverHooks<ModelType, SourceType> extends RestoreResolverBaseHooks<ModelType, SourceType> {

    $fetchRestoreModel?(id: string, modelRestored: boolean, info: RestoreResolverInfo<SourceType>): OptionalPromise<ModelType>

    $restoreModel?(model: ModelType, entityManager: EntityManager, resolverInfo: RestoreResolverInfo<SourceType>): OptionalPromise<boolean>
}

export function restoreResolver<ModelType, SourceType=any>(options: RestoreResolverOptions, hooks?: RestoreResolverHooks<ModelType, SourceType>){

    return async function(source: SourceType, args: AnyObject, context: any, info: GraphQLResolveInfo){

        // Initialize
        const plugins = options.plugins || [];
        const pluginHooks = flatten(plugins.map(plugin => plugin.getRestoreResolverHooks ? plugin.getRestoreResolverHooks() : null));
        const hookCollections: RestoreResolverHooks<ModelType, SourceType>[] = compact([...pluginHooks, hooks]);
        const executeHooks = hooksExecutor(hookCollections);

        // Get model info
        const repository = options.dataSource.getRepository(options.model);
        const modelAlias = repository.metadata.name;
        const modelPrimaryColumn = getModelPrimaryColumn(repository.metadata);

        // Get ID
        const id = args[options.idArgument] as string;
        if(!id){
            throw new InvalidInputError('ID not provided', { id });
        }

        const resolverInfo: RestoreResolverInfo<SourceType> = { source, args, context, info, options, id };

        const fetchModel = async (modelRestored: boolean) => {

            await executeHooks('$beforeFetch', hooks => hooks.$beforeFetch(resolverInfo));

            let model;

            if(hooks?.$fetchRestoreModel){

                model = await hooks.$fetchRestoreModel(id, modelRestored, resolverInfo);
            }
            else {

                const queryBuilder = getModelSelectQuery(repository, id);
                queryBuilder.withDeleted();

                await executeHooks('$modifySelectQuery', hooks => hooks.$modifySelectQuery(queryBuilder, resolverInfo));

                model = await queryBuilder.getOne();
            }

            await executeHooks('$afterFetch', hooks => hooks.$afterFetch(model, resolverInfo));

            return model;
        }

        await executeHooks('$beforeResolver', hooks => hooks.$beforeResolver(resolverInfo));
        await executeHooks('$beforeRestoreResolver', hooks => hooks.$beforeRestoreResolver(resolverInfo));

        // Fetch data
        let model = await fetchModel(false);

        // Check not found
        if(!model){

            await executeHooks('$onRestoreNotFound', hooks => hooks.$onRestoreNotFound(resolverInfo));
            throwModelNotFound(modelAlias, id);
        }

        // Check access
        let allowed = true;

        const mutationAllowedResults = await executeHooks('$mutationAllowed', hooks => hooks.$mutationAllowed(resolverInfo));
        if(mutationAllowedResults.indexOf(false) >= 0){
            allowed = false;
        }

        const restoreAllowedResults = await executeHooks('$restoreAllowed', hooks => hooks.$restoreAllowed(model, resolverInfo));
        if(restoreAllowedResults.indexOf(false) >= 0){
            allowed = false;
        }

        if(!allowed){

            await executeHooks('$onRestoreNotAllowed', hooks => hooks.$onRestoreNotAllowed(model, resolverInfo));
            throw new ForbiddenError(`Forbidden to restore ${modelAlias} with ID "${id}"`);
        }

        // Restore
        try {

            await options.dataSource.transaction(async transaction => {

                await executeHooks('$beforeRestoreModel', hooks => hooks.$beforeRestoreModel(model, transaction, resolverInfo));

                let success;

                if(hooks?.$restoreModel){

                    success = await hooks.$restoreModel(model, transaction, resolverInfo);
                    if(success !== false){
                        success = true;
                    }
                }
                else {

                    const transactionRepository = transaction.getRepository(options.model);

                    let restoreQueryBuilder: SoftDeleteQueryBuilder<ModelType> = transactionRepository.createQueryBuilder().restore();

                    restoreQueryBuilder.where(`${modelPrimaryColumn.propertyName} = :id`, { id });

                    await executeHooks('$modifyRestoreQuery', hooks => hooks.$modifyRestoreQuery(restoreQueryBuilder, model, transaction, resolverInfo));

                    await restoreQueryBuilder.execute();
                    success = true;
                }

                if(!success){
                    throw new DataError(`Unable to restore ${modelAlias} with ID "${id}"`);
                }

                await executeHooks('$afterRestoreModel', hooks => hooks.$afterRestoreModel(model, transaction, resolverInfo));
            });
        }
        catch(e){

            await executeHooks('$onRestoreFailed', hooks => hooks.$onRestoreFailed(model, e, resolverInfo));
            throw e;
        }

        // Modify results
        let result = await fetchModel(true);
        const originalResult = clone(result);

        const transformedResult = await executeHooks('$transformRestoreResult', (hooks, previousResult) => hooks.$transformRestoreResult(previousResult || result, originalResult, resolverInfo));
        if(transformedResult.length){
            result = last(compact(transformedResult)) || result;
        }

        await executeHooks('$afterRestoreResolver', hooks => hooks.$afterRestoreResolver(result, resolverInfo));
        await executeHooks('$afterResolver', hooks => hooks.$afterResolver(resolverInfo));

        return result;
    }
}

export default restoreResolver;