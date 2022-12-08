import { compact, flatten } from 'lodash'

import { GraphQLResolveInfo } from "graphql";

import { DataSource, DeleteQueryBuilder, EntityManager } from "typeorm";
import { SoftDeleteQueryBuilder } from "typeorm/query-builder/SoftDeleteQueryBuilder";

import {
    AnyObject,
    DataError,
    FieldBuilderInfo,
    ForbiddenError,
    InvalidInputError,
    Optional,
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

export interface DeleteResolverOptionsPartial {
    softDelete?: Optional<boolean>
    plugins?: Plugin[]
}

export interface DeleteResolverOptions extends DeleteResolverOptionsPartial {
    dataSource: DataSource
    model: ModelType
    idArgument: string
    fieldInfo: FieldBuilderInfo
}

export interface DeleteResolverInfo<SourceType> extends ResolverInfo<SourceType> {
    options: DeleteResolverOptions
    id: string
}

export interface DeleteResolverBaseHooks<ModelType, SourceType> extends ModelMutationResolverHooks<ModelType, SourceType> {

    $beforeDeleteResolver?(info: DeleteResolverInfo<SourceType>): OptionalPromise
    $afterDeleteResolver?(model: ModelType, info: DeleteResolverInfo<SourceType>): OptionalPromise

    $deleteAllowed?(model: ModelType, info: DeleteResolverInfo<SourceType>): OptionalPromise<boolean>

    $onDeleteNotAllowed?(model: ModelType, info: DeleteResolverInfo<SourceType>): OptionalPromise
    $onDeleteNotFound?(info: DeleteResolverInfo<SourceType>): OptionalPromise
    $onDeleteFailed?(model: ModelType, error: Error, info: DeleteResolverInfo<SourceType>): OptionalPromise

    $modifyDeleteQuery?(builder: DeleteQueryBuilder<ModelType> | SoftDeleteQueryBuilder<ModelType>, model: ModelType, entityManager: EntityManager, info: DeleteResolverInfo<SourceType>): OptionalPromise

    $beforeDeleteModel?(model: ModelType, entityManager: EntityManager, info: DeleteResolverInfo<SourceType>): OptionalPromise
    $afterDeleteModel?(model: ModelType, entityManager: EntityManager, info: DeleteResolverInfo<SourceType>): OptionalPromise
}

export interface DeleteResolverHooks<ModelType, SourceType> extends DeleteResolverBaseHooks<ModelType, SourceType> {

    $fetchDeleteModel?(id: string, info: DeleteResolverInfo<SourceType>): OptionalPromise<ModelType>

    $deleteModel?(model: ModelType, entityManager: EntityManager, resolverInfo: DeleteResolverInfo<SourceType>): OptionalPromise<boolean>
}

export function deleteResolver<ModelType, SourceType=any>(options: DeleteResolverOptions, hooks?: DeleteResolverHooks<ModelType, SourceType>){

    return async function(source: SourceType, args: AnyObject, context: any, info: GraphQLResolveInfo){

        // Initialize
        const plugins = options.plugins || [];
        const pluginHooks = flatten(plugins.map(plugin => plugin.getDeleteResolverHooks ? plugin.getDeleteResolverHooks() : null));
        const hookCollections: DeleteResolverHooks<ModelType, SourceType>[] = compact([...pluginHooks, hooks]);
        const executeHooks = hooksExecutor(hookCollections);

        // Get ID
        const id = args[options.idArgument] as string;
        if(!id){
            throw new InvalidInputError('ID not provided', { id });
        }

        const resolverInfo: DeleteResolverInfo<SourceType> = { source, args, context, info, options, id };

        await executeHooks('$beforeResolver', hooks => hooks.$beforeResolver(resolverInfo));
        await executeHooks('$beforeDeleteResolver', hooks => hooks.$beforeDeleteResolver(resolverInfo));

        // Get model info
        const repository = options.dataSource.getRepository(options.model);
        const modelAlias = repository.metadata.name;
        const modelPrimaryColumn = getModelPrimaryColumn(repository.metadata);

        // Fetch data
        await executeHooks('$beforeFetch', hooks => hooks.$beforeFetch(resolverInfo));

        let model;

        if(hooks?.$fetchDeleteModel){

            model = await hooks.$fetchDeleteModel(id, resolverInfo);
        }
        else if(hooks?.$fetchModel){

            model = await hooks.$fetchModel(id, resolverInfo);
        }
        else {

            const queryBuilder = getModelSelectQuery(repository, id);
            await executeHooks('$modifySelectQuery', hooks => hooks.$modifySelectQuery(queryBuilder, resolverInfo));

            model = await queryBuilder.getOne();
        }

        await executeHooks('$afterFetch', hooks => hooks.$afterFetch(model, resolverInfo));

        // Check not found
        if(!model){

            await executeHooks('$onDeleteNotFound', hooks => hooks.$onDeleteNotFound(resolverInfo));
            throwModelNotFound(modelAlias, id);
        }

        // Check access
        let allowed = true;

        const mutationAllowedResults = await executeHooks('$mutationAllowed', hooks => hooks.$mutationAllowed(resolverInfo));
        if(mutationAllowedResults.indexOf(false) >= 0){
            allowed = false;
        }

        const deleteAllowedResults = await executeHooks('$deleteAllowed', hooks => hooks.$deleteAllowed(model, resolverInfo));
        if(deleteAllowedResults.indexOf(false) >= 0){
            allowed = false;
        }

        if(!allowed){

            await executeHooks('$onDeleteNotAllowed', hooks => hooks.$onDeleteNotAllowed(model, resolverInfo));
            throw new ForbiddenError(`Forbidden to delete ${modelAlias} with ID "${id}"`);
        }

        // Check soft delete
        let softDelete = options.softDelete;

        // Auto soft delete, based on the existence of a delete date column
        if(softDelete === null || softDelete === undefined){
            softDelete = !!repository.metadata.deleteDateColumn;
        }

        // Delete
        try {

            await options.dataSource.transaction(async transaction => {

                await executeHooks('$beforeDeleteModel', hooks => hooks.$beforeDeleteModel(model, transaction, resolverInfo));

                let success;

                if(hooks?.$deleteModel){

                    success = await hooks.$deleteModel(model, transaction, resolverInfo);
                    if(success !== false){
                        success = true;
                    }
                }
                else {

                    const transactionRepository = transaction.getRepository(options.model);

                    let deleteQueryBuilder: DeleteQueryBuilder<ModelType> | SoftDeleteQueryBuilder<ModelType>;
                    if(softDelete){
                        deleteQueryBuilder = transactionRepository.createQueryBuilder().softDelete();
                    }
                    else {
                        deleteQueryBuilder = transactionRepository.createQueryBuilder().delete();
                    }

                    deleteQueryBuilder.where(`${modelPrimaryColumn.propertyName} = :id`, { id });

                    await executeHooks('$modifyDeleteQuery', hooks => hooks.$modifyDeleteQuery(deleteQueryBuilder, model, transaction, resolverInfo));

                    await deleteQueryBuilder.execute();
                    success = true;
                }

                if(!success){
                    throw new DataError(`Unable to delete ${modelAlias} with ID "${id}"`);
                }

                await executeHooks('$afterDeleteModel', hooks => hooks.$afterDeleteModel(model, transaction, resolverInfo));
            });
        }
        catch(e){

            await executeHooks('$onDeleteFailed', hooks => hooks.$onDeleteFailed(model, e, resolverInfo));
            throw e;
        }

        await executeHooks('$afterDeleteResolver', hooks => hooks.$afterDeleteResolver(model, resolverInfo));
        await executeHooks('$afterResolver', hooks => hooks.$afterResolver(resolverInfo));

        return true;
    }
}

export default deleteResolver;