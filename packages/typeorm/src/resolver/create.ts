import { compact, first, last, clone, assign, flatten, cloneDeep } from 'lodash'

import { GraphQLResolveInfo } from "graphql";
import { DataSource, EntityManager, InsertQueryBuilder } from "typeorm";

import {
    AnyObject,
    DataError,
    FieldBuilderInfo,
    ForbiddenError,
    InvalidInputError,
    Optional,
    OptionalPromise
} from "@kiwano/core";

import { ModelType } from "../common";
import { Plugin } from "../plugin";
import {
    getModelPrimaryColumn,
    getModelSelectQuery,
    hooksExecutor,
    InputResolverInfo,
    ModelInputMutationResolverHooks,
    throwModelNotFound
} from "./common";

export interface CreateResolverOptions {
    dataSource: DataSource
    model: ModelType
    inputArgument: string
    fieldInfo: FieldBuilderInfo
    plugins?: Plugin[]
}

export interface CreateResolverInfo<SourceType> extends InputResolverInfo<SourceType> {
    options: CreateResolverOptions
}

export interface InsertModelResult {
    id: any
    data?: AnyObject
}

export interface CreateResolverBaseHooks<ModelType, SourceType> extends ModelInputMutationResolverHooks<ModelType, SourceType> {

    $beforeCreateResolver?(info: CreateResolverInfo<SourceType>): OptionalPromise
    $afterCreateResolver?(info: CreateResolverInfo<SourceType>, result: ModelType | any): OptionalPromise

    $validateCreateInput?(input: AnyObject, info: CreateResolverInfo<SourceType>): OptionalPromise<boolean>
    $createAllowed?(info: CreateResolverInfo<SourceType>): OptionalPromise<boolean>

    $onCreateNotAllowed?(info: CreateResolverInfo<SourceType>): OptionalPromise
    $onCreateInputInvalid?(info: CreateResolverInfo<SourceType>): OptionalPromise
    $onCreateFailed?(error: Error, info: CreateResolverInfo<SourceType>): OptionalPromise

    $transformCreateInput?(input: AnyObject, originalInput: AnyObject, info: CreateResolverInfo<SourceType>): OptionalPromise<Optional<AnyObject>>
    $transformCreateResult?(result: ModelType | any, originalResult: ModelType, info: CreateResolverInfo<SourceType>): OptionalPromise<Optional<ModelType | any>>

    $modifyInsertQuery?(builder: InsertQueryBuilder<ModelType>, entityManager: EntityManager, info: CreateResolverInfo<SourceType>): OptionalPromise

    $beforeInsertModel?(entityManager: EntityManager, info: CreateResolverInfo<SourceType>): OptionalPromise
    $afterInsertModel?(model: ModelType, entityManager: EntityManager, info: CreateResolverInfo<SourceType>): OptionalPromise
}

export interface CreateResolverHooks<ModelType, SourceType> extends CreateResolverBaseHooks<ModelType, SourceType> {

    $insertModel?(input: AnyObject, entityManager: EntityManager, info: CreateResolverInfo<SourceType>): OptionalPromise<InsertModelResult>

    $fetchCreateModel?(id: string, info: CreateResolverInfo<SourceType>): OptionalPromise<ModelType>
}

export function createResolver<ModelType, SourceType=any>(options: CreateResolverOptions, hooks?: CreateResolverHooks<ModelType, SourceType>){

    return async function(source: SourceType, args: AnyObject, context: any, info: GraphQLResolveInfo){

        // Initialize
        const plugins = options.plugins || [];
        const pluginHooks = flatten(plugins.map(plugin => plugin.getCreateResolverHooks ? plugin.getCreateResolverHooks() : null));
        const hookCollections: CreateResolverHooks<ModelType, SourceType>[] = compact([...pluginHooks, hooks]);
        const executeHooks = hooksExecutor(hookCollections);

        // Get input
        let input = args[options.inputArgument] as AnyObject;
        if(!input){
            throw new InvalidInputError('No input provided', { input });
        }

        const resolverInfo: CreateResolverInfo<SourceType> = { source, args, context, info, options, input, originalInput: input };
        const originalInput = cloneDeep(input);

        await executeHooks('$beforeResolver', hooks => hooks.$beforeResolver(resolverInfo));
        await executeHooks('$beforeCreateResolver', hooks => hooks.$beforeCreateResolver(resolverInfo));

        // Validate input
        let inputValid = true;

        const inputValidResults = await executeHooks('$validateInput', hooks => hooks.$validateInput(input, resolverInfo));
        if(inputValidResults.indexOf(false) >= 0){
            inputValid = false;
        }

        const createInputValidResults = await executeHooks('$validateCreateInput', hooks => hooks.$validateCreateInput(input, resolverInfo));
        if(createInputValidResults.indexOf(false) >= 0){
            inputValid = false;
        }

        if(!inputValid){

            await executeHooks('$onCreateInputInvalid', hooks => hooks.$onCreateInputInvalid(resolverInfo));
            throw new InvalidInputError('Invalid input provided', { input });
        }

        // Get model info
        const repository = options.dataSource.getRepository(options.model);
        const modelAlias = repository.metadata.name;
        const modelPrimaryColumn = getModelPrimaryColumn(repository.metadata);

        // Check access
        let allowed = true;

        const mutationAllowedResults = await executeHooks('$mutationAllowed', hooks => hooks.$mutationAllowed(resolverInfo));
        if(mutationAllowedResults.indexOf(false) >= 0){
            allowed = false;
        }

        const createAllowedResults = await executeHooks('$createAllowed', hooks => hooks.$createAllowed(resolverInfo));
        if(createAllowedResults.indexOf(false) >= 0){
            allowed = false;
        }

        if(!allowed){

            await executeHooks('$onCreateNotAllowed', hooks => hooks.$onCreateNotAllowed(resolverInfo));
            throw new ForbiddenError(`Forbidden to create ${modelAlias}`);
        }

        // Modify input
        const transformedInputResults = await executeHooks('$transformInput', (hooks, previousInput: AnyObject) => hooks.$transformInput(previousInput || input, originalInput, resolverInfo));
        if(transformedInputResults.length){
            input = last(compact(transformedInputResults)) || input;
            resolverInfo.input = input;
        }

        const transformedCreateInputResults = await executeHooks('$transformCreateInput', (hooks, previousInput: AnyObject) => hooks.$transformCreateInput(previousInput || input, originalInput, resolverInfo));
        if(transformedCreateInputResults.length){
            input = last(compact(transformedCreateInputResults)) || input;
            resolverInfo.input = input;
        }

        // Insert
        let insertId = null;

        try {

            await options.dataSource.transaction(async transaction => {

                await executeHooks('$beforeSave', hooks => hooks.$beforeSave(transaction, resolverInfo));
                await executeHooks('$beforeInsertModel', hooks => hooks.$beforeInsertModel(transaction, resolverInfo));

                // Update input from resolver info
                input = resolverInfo.input;

                let insertedData = null;

                const transactionRepository = transaction.getRepository(options.model);

                if(hooks?.$insertModel){

                    const insertResult = await hooks.$insertModel(input, transaction, resolverInfo);

                    if(insertResult){
                        insertedData = insertResult.data;
                        insertId = insertResult.id;
                    }
                }
                else {

                    // Clone input, because TypeORM mutates it on insert
                    let inputValues = clone(input);

                    const transactionRepository = transaction.getRepository(options.model);
                    const insertQueryBuilder = transactionRepository.createQueryBuilder().insert().into(options.model).values(inputValues);

                    await executeHooks('$modifyInsertQuery', hooks => hooks.$modifyInsertQuery(insertQueryBuilder, transaction, resolverInfo));

                    const insertResult = await insertQueryBuilder.execute();
                    const firstIdentifier = first(insertResult.identifiers);
                    const firstMap = first(insertResult.generatedMaps);

                    insertId = firstIdentifier ? firstIdentifier[modelPrimaryColumn.propertyName] : null;
                    insertedData = firstMap ? assign({}, inputValues, firstMap) : null;
                }

                if(!insertId){
                    throw new DataError(`Unable to create ${modelAlias}`);
                }

                const resultModel = await transactionRepository.findOneByOrFail({
                    [modelPrimaryColumn.propertyName]: insertId
                });

                await executeHooks('$afterInsertModel', hooks => hooks.$afterInsertModel(resultModel, transaction, resolverInfo));
                await executeHooks('$afterSave', hooks => hooks.$afterSave(insertedData, transaction, resolverInfo));
            });
        }
        catch(e){

            await executeHooks('$onCreateFailed', hooks => hooks.$onCreateFailed(e, resolverInfo));
            throw e;
        }

        // Fetch created model
        await executeHooks('$beforeFetch', hooks => hooks.$beforeFetch(resolverInfo));

        let model;

        if(hooks?.$fetchCreateModel){

            model = await hooks.$fetchCreateModel(insertId, resolverInfo);
        }
        else if(hooks?.$fetchModel){

            model = await hooks.$fetchModel(insertId, resolverInfo);
        }
        else {

            const queryBuilder = getModelSelectQuery(repository, insertId);
            await executeHooks('$modifySelectQuery', hooks => hooks.$modifySelectQuery(queryBuilder, resolverInfo));

            model = await queryBuilder.getOne();
        }

        await executeHooks('$afterFetch', hooks => hooks.$afterFetch(model, resolverInfo));

        // Check not found
        if(!model){
            throwModelNotFound(modelAlias, insertId);
        }

        // Modify results
        let result = model;
        const originalResult = clone(result);

        const transformedResult = await executeHooks('$transformCreateResult', (hooks, previousResult) => hooks.$transformCreateResult(previousResult || result, originalResult, resolverInfo));
        if(transformedResult.length){
            result = last(compact(transformedResult)) || result;
        }

        await executeHooks('$afterCreateResolver', hooks => hooks.$afterCreateResolver(resolverInfo, model));
        await executeHooks('$afterResolver', hooks => hooks.$afterResolver(resolverInfo));

        return result;
    }
}

export default createResolver;