import { GraphQLResolveInfo } from "graphql";

export { IMiddleware as Middleware } from "graphql-middleware/dist/types";

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