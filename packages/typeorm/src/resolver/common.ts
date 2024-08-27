import { first } from "lodash";

import { EntityManager, Repository, SelectQueryBuilder } from "typeorm";
import { EntityMetadata } from "typeorm/metadata/EntityMetadata";
import { ColumnMetadata } from "typeorm/metadata/ColumnMetadata";

import {
    AnyObject,
    EntityFieldType,
    FieldBuilderInfo,
    NotFoundError,
    Optional,
    OptionalPromise,
    ResolverError,
    ResolverInfo
} from "@kiwano/core";

export interface EntityFieldInfo {
    entityFieldType: EntityFieldType
    resolverOptions: AnyObject
}

export interface InputResolverInfo<SourceType> extends ResolverInfo<SourceType> {
    originalInput: AnyObject
    input: AnyObject
}

export interface ModelResolverHooks<ModelType, SourceType, FetchResultType> {

    $executeResolver?(info: ResolverInfo<SourceType>, fieldInfo: EntityFieldInfo)

    $beforeResolver?(info: ResolverInfo<SourceType>): OptionalPromise
    $afterResolver?(info: ResolverInfo<SourceType>): OptionalPromise

    $beforeFetch?(info: ResolverInfo<SourceType>): OptionalPromise;
    $afterFetch?(result: FetchResultType, info: ResolverInfo<SourceType>): OptionalPromise;

    $modifySelectQuery?(builder: SelectQueryBuilder<ModelType>, info: ResolverInfo<SourceType>, extra?: any): OptionalPromise
}

export interface ModelQueryResolverHooks<ModelType, SourceType> extends ModelResolverHooks<ModelType, SourceType, any> {

    $queryAllowed?(info: ResolverInfo<SourceType>): OptionalPromise<boolean>
}

export interface ModelMutationResolverHooks<ModelType, SourceType> extends ModelResolverHooks<ModelType, SourceType, ModelType> {

    $mutationAllowed?(info: ResolverInfo<SourceType>): OptionalPromise<boolean>

    $fetchModel?(id: string, info: ResolverInfo<SourceType>): OptionalPromise<ModelType>
}

export interface ModelInputMutationResolverHooks<ModelType, SourceType> extends ModelMutationResolverHooks<ModelType, SourceType> {

    $validateInput?(input: AnyObject, info: InputResolverInfo<SourceType>): OptionalPromise<boolean>
    $transformInput?(input: AnyObject, originalInput: AnyObject, info: InputResolverInfo<SourceType>): OptionalPromise<Optional<AnyObject>>

    $beforeSave?(entityManager: EntityManager, info: InputResolverInfo<SourceType>): OptionalPromise
    $afterSave?(model: ModelType, entityManager: EntityManager, info: InputResolverInfo<SourceType>): OptionalPromise
}

export function getModelSelectQuery<T>(repository: Repository<T>, id: string): SelectQueryBuilder<T> {

    const modelAlias = repository.metadata.name;
    const modelPrimaryColumn = getModelPrimaryColumn(repository.metadata);

    const queryBuilder = repository.createQueryBuilder(modelAlias);
    queryBuilder.where(`${modelAlias}.${modelPrimaryColumn.propertyName} = :id`, { id });

    return queryBuilder;
}

export function getModelPrimaryColumn(metadata: EntityMetadata): ColumnMetadata {

    const modelPrimaryColumn = first(metadata.primaryColumns);
    if(!modelPrimaryColumn){
        throw new ResolverError(`No primary column found for ${metadata.name}`);
    }

    return modelPrimaryColumn
}

export async function executeHooks<T, R>(hookCollections: T[], methodName: string, fn: (hooks: T, previousResult?: R) => OptionalPromise<R>): Promise<R[]> {

    let results: R[] = [];
    let previousResult: R = null;

    for(let hooks of hookCollections){

        if(hooks[methodName]){

            const result = await fn(hooks, previousResult);

            results.push(result);
            previousResult = result;
        }
    }

    return results;
}

export function hooksExecutor<T>(hookCollections: T[]){

    return <R>(methodName: string, fn: (hooks: T, previousResult?: R) => OptionalPromise<R>) => executeHooks<T, R>(hookCollections, methodName, fn);
}

export function throwModelNotFound(modelAlias, id){

    throw new NotFoundError(`${modelAlias} with ID "${id}" not found`);
}