import { compact, last, flatten, clone } from 'lodash'

import { GraphQLResolveInfo } from "graphql";
import { Connection, SelectQueryBuilder } from "typeorm";

import { AnyObject, FieldBuilderInfo, ForbiddenError, Optional, OptionalPromise, ResolverInfo } from "@kiwano/core";

import { ModelType } from "../common";
import { hooksExecutor, ModelQueryResolverHooks } from "./common";
import { Plugin } from "../plugin";

export interface AllResolverOptions {
    connection: Connection
    model: ModelType
    fieldInfo: FieldBuilderInfo
    plugins?: Plugin[]
}

export interface AllResolverHelpers {
    getQueryBuilder(extra?: any): Promise<SelectQueryBuilder<any>>
    fetchData(extra?: any): Promise<any>
}

export interface AllResolverInfo<SourceType> extends ResolverInfo<SourceType> {
    options: AllResolverOptions
    helpers: AllResolverHelpers
}

export interface AllResolverBaseHooks<ModelType, SourceType> extends ModelQueryResolverHooks<ModelType, SourceType> {

    $beforeAllResolver?(info: AllResolverInfo<SourceType>): OptionalPromise
    $afterAllResolver?(info: AllResolverInfo<SourceType>): OptionalPromise

    $beforeFetchAll?(info: AllResolverInfo<SourceType>): OptionalPromise;
    $afterFetchAll?(result: ModelType[], info: AllResolverInfo<SourceType>): OptionalPromise;

    $modifyAllQuery?(builder: SelectQueryBuilder<ModelType>, info: AllResolverInfo<SourceType>, extra?: any): OptionalPromise
    $transformAllResult?(result: ModelType[] | any, originalResult: ModelType[], info: AllResolverInfo<SourceType>): OptionalPromise<Optional<ModelType[] | any>>

    $allAllowed?(result: ModelType[], info: AllResolverInfo<SourceType>): OptionalPromise<boolean>
    $onAllNotAllowed?(result: ModelType[], info: AllResolverInfo<SourceType>): OptionalPromise
}

export interface AllResolverHooks<ModelType, SourceType> extends AllResolverBaseHooks<ModelType, SourceType> {

    $fetchAll?(info: AllResolverInfo<SourceType>, extra?: any): OptionalPromise<ModelType[]>
}

export function allResolver<ModelType, SourceType=any>(options: AllResolverOptions, hooks?: AllResolverHooks<ModelType, SourceType>){

    return async function(source: SourceType, args: AnyObject, context: any, info: GraphQLResolveInfo){

        // Initialize
        const plugins = options.plugins || [];

        const pluginHooks = flatten(plugins.map(plugin => plugin.getAllResolverHooks ? plugin.getAllResolverHooks() : null));
        const hookCollections: AllResolverHooks<ModelType, SourceType>[] = compact([...pluginHooks, hooks]);
        const executeHooks = hooksExecutor(hookCollections);

        // Get model info
        const repository = options.connection.getRepository(options.model);
        const modelAlias = repository.metadata.name;

        // Create helpers
        const helpers: AllResolverHelpers = {

            async getQueryBuilder(extra?: any){

                const queryBuilder = repository.createQueryBuilder(modelAlias);

                await executeHooks('$modifySelectQuery', hooks => hooks.$modifySelectQuery(queryBuilder, resolverInfo, extra));
                await executeHooks('$modifyAllQuery', hooks => hooks.$modifyAllQuery(queryBuilder, resolverInfo, extra));

                return queryBuilder;
            },

            async fetchData(extra?: any){

                let result;

                if(hooks?.$fetchAll){

                    result = await hooks.$fetchAll(resolverInfo, extra);
                }
                else {

                    const queryBuilder = await helpers.getQueryBuilder(extra);
                    result = await queryBuilder.getMany();
                }

                return result;
            }
        }

        const resolverInfo: AllResolverInfo<SourceType> = { source, args, context, info, options, helpers };

        await executeHooks('$beforeResolver', hooks => hooks.$beforeResolver(resolverInfo));
        await executeHooks('$beforeAllResolver', hooks => hooks.$beforeAllResolver(resolverInfo));

        // Fetch data
        await executeHooks('$beforeFetch', hooks => hooks.$beforeFetch(resolverInfo));
        await executeHooks('$beforeFetchAll', hooks => hooks.$beforeFetchAll(resolverInfo));

        let result = await helpers.fetchData();

        await executeHooks('$afterFetchAll', hooks => hooks.$afterFetchAll(result, resolverInfo));
        await executeHooks('$afterFetch', hooks => hooks.$afterFetch(result, resolverInfo));

        // Check access
        let allowed = true;

        const queryAllowedResults = await executeHooks('$queryAllowed', hooks => hooks.$queryAllowed(resolverInfo));
        if(queryAllowedResults.indexOf(false) >= 0){
            allowed = false;
        }

        const allAllowedResults = await executeHooks('$allAllowed', hooks => hooks.$allAllowed(result, resolverInfo));
        if(allAllowedResults.indexOf(false) >= 0){
            allowed = false;
        }

        if(!allowed){

            await executeHooks('$onAllNotAllowed', hooks => hooks.$onAllNotAllowed(result, resolverInfo));
            throw new ForbiddenError(`No access to ${modelAlias} list`);
        }

        // Modify results
        const originalResult = clone(result);

        const transformedResult = await executeHooks('$transformAllResult', (hooks, previousResult) => hooks.$transformAllResult(previousResult || result, originalResult, resolverInfo));
        if(transformedResult.length){
            result = last(compact(transformedResult)) || result;
        }

        await executeHooks('$afterAllResolver', hooks => hooks.$afterAllResolver(resolverInfo));
        await executeHooks('$afterResolver', hooks => hooks.$afterResolver(resolverInfo));

        return result;
    }
}

export default allResolver;