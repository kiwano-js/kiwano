import { GraphQLResolveInfo } from "graphql";
import { Connection, SelectQueryBuilder } from "typeorm";

import compact from 'lodash/compact'
import last from 'lodash/last'
import flatten from 'lodash/flatten'
import clone from 'lodash/clone'

import {
    AnyObject,
    FieldBuilderInfo,
    ForbiddenError,
    InvalidInputError,
    Optional,
    OptionalPromise,
    ResolverInfo
} from "@kiwano/core";

import { ModelType } from "../common";
import { getModelSelectQuery, hooksExecutor, ModelQueryResolverHooks, throwModelNotFound } from "./common";
import { Plugin } from "../plugin";

export interface FindResolverOptions {
    connection: Connection
    model: ModelType
    idArgument: string
    fieldInfo: FieldBuilderInfo
    plugins?: Plugin[]
    resultRequired?: boolean
}

export interface FindResolverHelpers<ModelType> {
    getQueryBuilder(extra?: any): Promise<SelectQueryBuilder<ModelType>>
    fetchData(extra?: any): Promise<ModelType>
}

export interface FindResolverInfo<ModelType, SourceType> extends ResolverInfo<SourceType> {
    options: FindResolverOptions
    helpers: FindResolverHelpers<ModelType>
    id: string
}

export interface FindResolverBaseHooks<ModelType, SourceType> extends ModelQueryResolverHooks<ModelType, SourceType> {

    $beforeFindResolver?(info: FindResolverInfo<ModelType, SourceType>): OptionalPromise
    $afterFindResolver?(info: FindResolverInfo<ModelType, SourceType>): OptionalPromise

    $beforeFetchFind?(info: FindResolverInfo<ModelType, SourceType>): OptionalPromise;
    $afterFetchFind?(result: ModelType, info: FindResolverInfo<ModelType, SourceType>): OptionalPromise;

    $modifyFindQuery?(builder: SelectQueryBuilder<ModelType>, info: FindResolverInfo<ModelType, SourceType>, extra?: any): OptionalPromise
    $transformFindResult?(result: ModelType | any, originalResult: ModelType, info: FindResolverInfo<ModelType, SourceType>): OptionalPromise<Optional<ModelType | any>>

    $findAllowed?(model: ModelType, info: FindResolverInfo<ModelType, SourceType>): OptionalPromise<boolean>

    $onFindNotFound?(info: FindResolverInfo<ModelType, SourceType>): OptionalPromise
    $onFindNotAllowed?(model: ModelType, info: FindResolverInfo<ModelType, SourceType>): OptionalPromise
}

export interface FindResolverHooks<ModelType, SourceType> extends FindResolverBaseHooks<ModelType, SourceType> {

    $fetchFind?(id: string, info: FindResolverInfo<ModelType, SourceType>, extra?: any): OptionalPromise<ModelType>
}

export function findResolver<ModelType, SourceType=any>(options: FindResolverOptions, hooks?: FindResolverHooks<ModelType, SourceType>){

    return async function(source: SourceType, args: AnyObject, context: any, info: GraphQLResolveInfo){

        // Initialize
        const plugins = options.plugins || [];
        const pluginHooks = flatten(plugins.map(plugin => plugin.getFindResolverHooks ? plugin.getFindResolverHooks() : null));
        const hookCollections: FindResolverHooks<ModelType, SourceType>[] = compact([...pluginHooks, hooks]);
        const executeHooks = hooksExecutor(hookCollections);

        // Get model info
        const repository = options.connection.getRepository(options.model);
        const modelAlias = repository.metadata.name;

        // Get ID
        const id = args[options.idArgument] as string;
        if(!id){
            throw new InvalidInputError('ID not provided', { id });
        }

        // Create helpers
        const helpers: FindResolverHelpers<ModelType> = {

            async getQueryBuilder(extra?: any){

                const queryBuilder = getModelSelectQuery(repository, id);

                await executeHooks('$modifySelectQuery', hooks => hooks.$modifySelectQuery(queryBuilder, resolverInfo, extra));
                await executeHooks('$modifyFindQuery', hooks => hooks.$modifyFindQuery(queryBuilder, resolverInfo, extra));

                return queryBuilder;
            },

            async fetchData(extra?: any){

                let result;

                if(hooks?.$fetchFind){

                    result = await hooks.$fetchFind(id, resolverInfo, extra);
                }
                else {

                    const queryBuilder = await helpers.getQueryBuilder(extra);
                    result = await queryBuilder.getOne();
                }

                return result;
            }
        };

        const resolverInfo: FindResolverInfo<ModelType, SourceType> = { source, args, context, info, options, id, helpers };

        await executeHooks('$beforeResolver', hooks => hooks.$beforeResolver(resolverInfo));
        await executeHooks('$beforeFindResolver', hooks => hooks.$beforeFindResolver(resolverInfo));

        // Fetch data
        await executeHooks('$beforeFetch', hooks => hooks.$beforeFetch(resolverInfo));
        await executeHooks('$beforeFetchFind', hooks => hooks.$beforeFetchFind(resolverInfo));

        let result = await helpers.fetchData() as any;

        await executeHooks('$afterFetchFind', hooks => hooks.$afterFetchFind(result, resolverInfo));
        await executeHooks('$afterFetch', hooks => hooks.$afterFetch(result, resolverInfo));

        // Check not found
        if(!result){

            await executeHooks('$onFindNotFound', hooks => hooks.$onFindNotFound(resolverInfo));

            if(options.resultRequired) {
                throwModelNotFound(modelAlias, id);
            }
        }
        else {

            // Check access
            let allowed = true;

            const queryAllowedResults = await executeHooks('$queryAllowed', hooks => hooks.$queryAllowed(resolverInfo));
            if(queryAllowedResults.indexOf(false) >= 0){
                allowed = false;
            }

            const findAllowedResults = await executeHooks('$findAllowed', hooks => hooks.$findAllowed(result, resolverInfo));
            if(findAllowedResults.indexOf(false) >= 0){
                allowed = false;
            }

            if(!allowed){

                await executeHooks('$onFindNotAllowed', hooks => hooks.$onFindNotAllowed(result, resolverInfo));
                throw new ForbiddenError(`No access to ${modelAlias} with ID "${id}"`);
            }

            // Modify results
            const originalResult = clone(result);

            const transformedResult = await executeHooks('$transformFindResult', (hooks, previousResult) => hooks.$transformFindResult(previousResult || result, originalResult, resolverInfo));
            if(transformedResult.length){
                result = last(compact(transformedResult)) || result;
            }
        }

        await executeHooks('$afterFindResolver', hooks => hooks.$afterFindResolver(resolverInfo));
        await executeHooks('$afterResolver', hooks => hooks.$afterResolver(resolverInfo));

        return result;
    }
}

export default findResolver;