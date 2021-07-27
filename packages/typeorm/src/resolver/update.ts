import { compact, last, assign, pickBy, flatten, cloneDeep, clone } from 'lodash'

import { GraphQLResolveInfo } from "graphql";

import { Connection, EntityManager, UpdateQueryBuilder } from "typeorm";

import {
    AnyObject,
    DataError,
    FieldBuilderInfo,
    ForbiddenError,
    InvalidInputError,
    Optional,
    OptionalPromise
} from "@kiwano/core";

import { Plugin } from "../plugin";
import { ModelType } from "../common";
import {
    getModelPrimaryColumn,
    getModelSelectQuery,
    hooksExecutor,
    InputResolverInfo,
    ModelInputMutationResolverHooks,
    throwModelNotFound
} from "./common";


export interface UpdateResolverOptions {
    connection: Connection
    model: ModelType
    inputArgument: string
    fieldInfo: FieldBuilderInfo
    idField?: string
    plugins?: Plugin[]
}

export interface UpdateResolverInfo<SourceType> extends InputResolverInfo<SourceType> {
    options: UpdateResolverOptions
    id: string
}

export interface UpdateModelResult {
    success?: boolean
    data?: AnyObject
}

export interface UpdateResolverBaseHooks<ModelType, SourceType> extends ModelInputMutationResolverHooks<ModelType, SourceType> {

    $beforeUpdateResolver?(info: UpdateResolverInfo<SourceType>): OptionalPromise
    $afterUpdateResolver?(info: UpdateResolverInfo<SourceType>): OptionalPromise

    $validateUpdateInput?(input: AnyObject, info: UpdateResolverInfo<SourceType>): OptionalPromise<boolean>
    $updateAllowed?(model: ModelType, info: UpdateResolverInfo<SourceType>): OptionalPromise<boolean>

    $onUpdateNotAllowed?(model: ModelType, info: UpdateResolverInfo<SourceType>): OptionalPromise
    $onUpdateNotFound?(info: UpdateResolverInfo<SourceType>): OptionalPromise
    $onUpdateFailed?(error: Error, model: ModelType, info: UpdateResolverInfo<SourceType>): OptionalPromise

    $transformUpdateInput?(input: AnyObject, model: ModelType, originalInput: AnyObject, info: UpdateResolverInfo<SourceType>): OptionalPromise<Optional<AnyObject>>
    $transformUpdateResult?(result: ModelType | any, originalResult: ModelType, info: UpdateResolverInfo<SourceType>): OptionalPromise<Optional<ModelType | any>>

    $modifyUpdateQuery?(builder: UpdateQueryBuilder<ModelType>, model: ModelType, entityManager: EntityManager, info: UpdateResolverInfo<SourceType>): OptionalPromise

    $beforeUpdateModel?(model: ModelType, entityManager: EntityManager, info: UpdateResolverInfo<SourceType>): OptionalPromise
    $afterUpdateModel?(model: ModelType, entityManager: EntityManager, info: UpdateResolverInfo<SourceType>): OptionalPromise
}

export interface UpdateResolverHooks<ModelType, SourceType> extends UpdateResolverBaseHooks<ModelType, SourceType> {

    $fetchUpdateModel?(id: string, modelUpdated: boolean, info: UpdateResolverInfo<SourceType>): OptionalPromise<ModelType>

    $updateModel?(model: ModelType, input: AnyObject, entityManager: EntityManager, info: UpdateResolverInfo<SourceType>): OptionalPromise<Optional<UpdateModelResult>>
}

export function updateResolver<ModelType, SourceType=any>(options: UpdateResolverOptions, hooks?: UpdateResolverHooks<ModelType, SourceType>){

    return async function(source: SourceType, args: AnyObject, context: any, info: GraphQLResolveInfo){

        // Initialize
        const plugins = options.plugins || [];
        const pluginHooks = flatten(plugins.map(plugin => plugin.getUpdateResolverHooks ? plugin.getUpdateResolverHooks() : null));
        const hookCollections: UpdateResolverHooks<ModelType, SourceType>[] = compact([...pluginHooks, hooks]);
        const executeHooks = hooksExecutor(hookCollections);

        // Get model info
        const repository = options.connection.getRepository(options.model);
        const modelAlias = repository.metadata.name;
        const modelPrimaryColumn = getModelPrimaryColumn(repository.metadata);

        // Get input
        let input = args[options.inputArgument] as AnyObject;
        if(!input){
            throw new InvalidInputError('No input provided', { input });
        }

        const idField = options.idField || modelPrimaryColumn.propertyName;
        const id = input[idField] as string;
        if(!id){
            throw new InvalidInputError('ID not provided', { id });
        }

        const resolverInfo: UpdateResolverInfo<SourceType> = { source, args, context, info, options, id, input, originalInput: input };

        const fetchModel = async (modelUpdated: boolean) => {

            await executeHooks('$beforeFetch', hooks => hooks.$beforeFetch(resolverInfo));

            let model;

            if(hooks?.$fetchUpdateModel){

                model = await hooks.$fetchUpdateModel(id, modelUpdated, resolverInfo);
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

            return model;
        }

        await executeHooks('$beforeResolver', hooks => hooks.$beforeResolver(resolverInfo));
        await executeHooks('$beforeUpdateResolver', hooks => hooks.$beforeUpdateResolver(resolverInfo));

        // Fetch data
        const model = await fetchModel(false);

        // Check not found
        if(!model){

            await executeHooks('$onUpdateNotFound', hooks => hooks.$onUpdateNotFound(resolverInfo));
            throwModelNotFound(modelAlias, id);
        }

        // Check access
        let allowed = true;

        const mutationAllowedResults = await executeHooks('$mutationAllowed', hooks => hooks.$mutationAllowed(resolverInfo));
        if(mutationAllowedResults.indexOf(false) >= 0){
            allowed = false;
        }

        const updateAllowedResults = await executeHooks('$updateAllowed', hooks => hooks.$updateAllowed(model, resolverInfo));
        if(updateAllowedResults.indexOf(false) >= 0){
            allowed = false;
        }

        if(!allowed){

            await executeHooks('$onUpdateNotAllowed', hooks => hooks.$onUpdateNotAllowed(model, resolverInfo));
            throw new ForbiddenError(`Forbidden to update ${modelAlias} with ID "${id}"`);
        }

        // Modify input
        const originalInput = cloneDeep(input);

        const transformedInputResults = await executeHooks('$transformInput', (hooks, previousInput: AnyObject) => hooks.$transformInput(previousInput || input, originalInput, resolverInfo));
        if(transformedInputResults.length){
            input = last(compact(transformedInputResults)) || input;
            resolverInfo.input = input;
        }

        const transformedCreateInputResults = await executeHooks('$transformUpdateInput', (hooks, previousInput: AnyObject) => hooks.$transformUpdateInput(previousInput || input, model, originalInput, resolverInfo));
        if(transformedCreateInputResults.length){
            input = last(compact(transformedCreateInputResults)) || input;
            resolverInfo.input = input;
        }

        // Update
        try {

            await options.connection.transaction(async transaction => {

                await executeHooks('$beforeSave', hooks => hooks.$beforeSave(transaction, resolverInfo));
                await executeHooks('$beforeUpdateModel', hooks => hooks.$beforeUpdateModel(model, transaction, resolverInfo));

                let success;
                let updatedData = null;

                if(hooks?.$updateModel){

                    const updateResult = await hooks.$updateModel(model, input, transaction, resolverInfo);

                    if(updateResult){

                        if(updateResult.success !== false){
                            success = true;
                        }

                        updatedData = updateResult.data || null;
                    }
                    else {
                        success = true;
                    }
                }
                else {

                    const transactionRepository = transaction.getRepository(options.model);
                    const safeUpdateData = pickBy(input, (_, key) => !!repository.metadata.findColumnWithPropertyName(key));

                    let updateQueryBuilder = transactionRepository.createQueryBuilder().update()
                        .set(safeUpdateData)
                        .where(`${modelPrimaryColumn.propertyName} = :id`, { id });

                    await executeHooks('$modifyUpdateQuery', hooks => hooks.$modifyUpdateQuery(updateQueryBuilder, model, transaction, resolverInfo));

                    await updateQueryBuilder.execute();
                    success = true;

                    updatedData = assign({}, model, safeUpdateData);
                }

                if(!success){
                    throw new DataError(`Unable to update ${modelAlias} with ID "${id}"`);
                }

                await executeHooks('$afterUpdateModel', hooks => hooks.$afterUpdateModel(model, transaction, resolverInfo));
                await executeHooks('$afterSave', hooks => hooks.$afterSave(updatedData, transaction, resolverInfo));
            });
        }
        catch(e){

            await executeHooks('$onUpdateFailed', hooks => hooks.$onUpdateFailed(model, e, resolverInfo));
            throw e;
        }

        // Modify results
        let result = await fetchModel(true);
        const originalResult = clone(result);

        const transformedResult = await executeHooks('$transformUpdateResult', (hooks, previousResult) => hooks.$transformUpdateResult(previousResult || result, originalResult, resolverInfo));
        if(transformedResult.length){
            result = last(compact(transformedResult)) || result;
        }

        await executeHooks('$afterUpdateResolver', hooks => hooks.$afterUpdateResolver(resolverInfo));
        await executeHooks('$afterResolver', hooks => hooks.$afterResolver(resolverInfo));

        return result;
    }
}

export default updateResolver;