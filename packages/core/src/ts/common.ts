import type { GraphQLResolveInfo } from "graphql";
import type { GraphQLFieldResolver } from "graphql/type/definition";

export type Middleware<TSource = any, TContext = any, TArgs = AnyObject> = (
    resolve: (...args: Partial<Parameters<GraphQLFieldResolver<TSource, TContext, TArgs>>>) => ReturnType<GraphQLFieldResolver<TSource, TContext, TArgs>>,
    source: TSource,
    args: TArgs,
    context: TContext,
    info: GraphQLResolveInfo
) => ReturnType<GraphQLFieldResolver<TSource, TContext, TArgs>>;

export type ConstructorType<T> = new (...args:any[]) => T;
export type OptionalPromise<T=void> = Promise<T> | T;

export type Configurator<T> = (object: T) => T | void;

export type AnyObject = Record<string, any>;
export type Optional<T> = T | void;

export interface ResolverInfo<ST> {
    source: ST
    args: AnyObject
    context: any,
    info: GraphQLResolveInfo
}

export interface FieldRuntime {
    resolve?: GraphQLFieldResolver<any, any>
    subscribe?: GraphQLFieldResolver<any, any>
}
