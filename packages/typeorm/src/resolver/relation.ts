import { compact, last, flatten, clone } from 'lodash'

import { GraphQLResolveInfo } from "graphql";
import { Connection, SelectQueryBuilder } from "typeorm";

import {
    AnyObject,
    FieldBuilderInfo,
    ForbiddenError,
    Optional,
    OptionalPromise,
    ResolverError,
    ResolverInfo
} from "@kiwano/core";

import { ModelType, relationIsMany } from "../common";
import { Plugin } from "../plugin";
import { hooksExecutor, ModelResolverHooks } from "./common";
import { RelationLoader } from "./RelationLoader";

export interface RelationResolverOptions {
    connection: Connection
    model: ModelType
    relation: string
    fieldInfo: FieldBuilderInfo
    plugins?: Plugin[]
}

export interface RelationResolverHelpers {
    getQueryBuilder(extra?: any): Promise<SelectQueryBuilder<any>>
    fetchData(extra?: any): Promise<any>
}

export interface RelationResolverInfo<SourceType> extends ResolverInfo<SourceType> {
    options: RelationResolverOptions
    helpers: RelationResolverHelpers
}

export interface RelationResolverBaseHooks<ModelType, SourceType, RelationModelType=object> extends ModelResolverHooks<ModelType, SourceType, any> {

    $beforeRelationResolver?(info: RelationResolverInfo<SourceType>): OptionalPromise
    $afterRelationResolver?(info: RelationResolverInfo<SourceType>): OptionalPromise

    $beforeFetchRelation?(relation: string, info: RelationResolverInfo<SourceType>): OptionalPromise;
    $afterFetchRelation?(relation: string, result: RelationModelType[] | RelationModelType, info: RelationResolverInfo<SourceType>): OptionalPromise;

    $modifyRelationQuery?(relation: string, builder: SelectQueryBuilder<RelationModelType>, info: RelationResolverInfo<SourceType>, extra?: any): OptionalPromise
    $modifyRelationSingleQuery?(relation: string, builder: SelectQueryBuilder<RelationModelType>, info: RelationResolverInfo<SourceType>, extra?: any): OptionalPromise
    $modifyRelationManyQuery?(relation: string, builder: SelectQueryBuilder<RelationModelType>, info: RelationResolverInfo<SourceType>, extra?: any): OptionalPromise

    $transformRelationResult?(relation: string, result: RelationModelType[] | RelationModelType | any, originalResult: RelationModelType[] | RelationModelType, info: RelationResolverInfo<SourceType>): OptionalPromise<Optional<RelationModelType[] | RelationModelType | any>>
    $transformRelationSingleResult?(relation: string, result: RelationModelType | any, originalResult: RelationModelType, info: RelationResolverInfo<SourceType>): OptionalPromise<Optional<RelationModelType | any>>
    $transformRelationManyResult?(relation: string, result: RelationModelType[] | any, originalResult: RelationModelType[], info: RelationResolverInfo<SourceType>): OptionalPromise<Optional<RelationModelType[] | any>>

    $relationAllowed?(relation: string, result: RelationModelType[] | RelationModelType, info: RelationResolverInfo<SourceType>): OptionalPromise<boolean>
    $onRelationNotAllowed?(relation: string, result: RelationModelType[] | RelationModelType, info: RelationResolverInfo<SourceType>): OptionalPromise
}

export interface RelationResolverHooks<ModelType, SourceType, RelationModelType> extends RelationResolverBaseHooks<ModelType, SourceType> {

    $fetchRelation?(relation: string, info: RelationResolverInfo<SourceType>): OptionalPromise<RelationModelType[] | RelationModelType>
}

export function relationResolver<ModelType, SourceType=any, RelationModelType=object>(options: RelationResolverOptions, hooks?: RelationResolverHooks<ModelType, SourceType, RelationModelType>){

    return async function(source: SourceType, args: AnyObject, context: any, info: GraphQLResolveInfo){

        // Initialize
        const plugins = options.plugins || [];
        const relation = options.relation;
        const pluginHooks = flatten(plugins.map(plugin => plugin.getRelationResolverHooks ? plugin.getRelationResolverHooks() : null));
        const hookCollections: RelationResolverHooks<ModelType, SourceType, RelationModelType>[] = compact([...pluginHooks, hooks]);
        const executeHooks = hooksExecutor(hookCollections);

        // Get model info
        const repository = options.connection.getRepository(options.model);
        const relationMetadata = repository.metadata.findRelationWithPropertyPath(relation);
        if(!relationMetadata){
            throw new ResolverError(`No metadata found for relation "${relation}" on "${repository.metadata.name}"`);
        }

        // Create helpers
        const helpers: RelationResolverHelpers = {

            async getQueryBuilder(extra?: any){

                const relationLoader = new RelationLoader(options.connection);
                const queryBuilder = relationLoader.query(relationMetadata, source, repository.queryRunner);

                await executeHooks('$modifyRelationQuery', hooks => hooks.$modifyRelationQuery(relation, queryBuilder, resolverInfo, extra));

                if(isMany){
                    await executeHooks('$modifyRelationManyQuery', hooks => hooks.$modifyRelationManyQuery(relation, queryBuilder, resolverInfo, extra));
                }
                else {
                    await executeHooks('$modifyRelationSingleQuery', hooks => hooks.$modifyRelationSingleQuery(relation, queryBuilder, resolverInfo, extra));
                }

                return queryBuilder;
            },

            async fetchData(extra?: any){

                let result;

                if(hooks?.$fetchRelation){

                    result = await hooks.$fetchRelation(relation, resolverInfo);
                }
                else {

                    const queryBuilder = await helpers.getQueryBuilder(extra);
                    result = isMany ? await queryBuilder.getMany() : await queryBuilder.getOne();
                }

                return result;
            }
        };

        const resolverInfo: RelationResolverInfo<SourceType> = { source, args, context, info, options, helpers };

        await executeHooks('$beforeResolver', hooks => hooks.$beforeResolver(resolverInfo));
        await executeHooks('$beforeRelationResolver', hooks => hooks.$beforeRelationResolver(resolverInfo));

        const isMany = relationIsMany(relationMetadata);

        // Fetch data
        await executeHooks('$beforeFetch', hooks => hooks.$beforeFetch(resolverInfo));
        await executeHooks('$beforeFetchRelation', hooks => hooks.$beforeFetchRelation(relation, resolverInfo));

        let result = await helpers.fetchData();

        await executeHooks('$afterFetchRelation', hooks => hooks.$afterFetchRelation(relation, result, resolverInfo));
        await executeHooks('$afterFetch', hooks => hooks.$afterFetch(result, resolverInfo));

        // Check access
        let allowed = true;

        const relationAllowedResults = await executeHooks('$relationAllowed', hooks => hooks.$relationAllowed(relation, result, resolverInfo));
        if(relationAllowedResults.indexOf(false) >= 0){
            allowed = false;
        }

        if(!allowed){

            await executeHooks('$onRelationNotAllowed', hooks => hooks.$onRelationNotAllowed(relation, result, resolverInfo));
            throw new ForbiddenError(`No access to relation "${relation}"`);
        }

        // Modify results
        const originalResult = clone(result);

        const transformedResult = await executeHooks('$transformRelationResult', (hooks, previousResult) => hooks.$transformRelationResult(relation, previousResult || result, originalResult, resolverInfo));
        if(transformedResult.length){
            result = last(compact(transformedResult)) || result;
        }

        if(isMany){

            const transformedManyResult = await executeHooks('$transformRelationManyResult', (hooks, previousResult) => hooks.$transformRelationManyResult(relation, previousResult || result, originalResult, resolverInfo));
            if(transformedManyResult.length){
                result = last(compact(transformedManyResult)) || result;
            }
        }
        else {

            const transformedSingleResult = await executeHooks('$transformRelationSingleResult', (hooks, previousResult) => hooks.$transformRelationSingleResult(relation, previousResult || result, originalResult, resolverInfo));
            if(transformedSingleResult.length){
                result = last(compact(transformedSingleResult)) || result;
            }
        }

        await executeHooks('$afterRelationResolver', hooks => hooks.$afterRelationResolver(resolverInfo));
        await executeHooks('$afterResolver', hooks => hooks.$afterResolver(resolverInfo));

        return result;
    }
}

export default relationResolver;