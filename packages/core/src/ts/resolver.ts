import { mergeSchemas } from "@graphql-tools/schema";

import { defaultFieldResolver, type GraphQLFieldResolver, type GraphQLSchema, isObjectType } from "graphql";

import type { Middleware } from "./common";

export function wrapResolver<TSource, TContext, TArgs>(
    resolver: GraphQLFieldResolver<TSource, TContext, TArgs>,
    middleware: Middleware<TSource, TContext, TArgs>
): GraphQLFieldResolver<TSource, TContext, TArgs> {

    return function(source, args, context, info): ReturnType<GraphQLFieldResolver<TSource, TContext, TArgs>> {

        const next = (
            nextSource = source,
            nextArgs = args,
            nextContext = context,
            nextInfo = info
        ): ReturnType<GraphQLFieldResolver<TSource, TContext, TArgs>> => {

            return resolver.call(this, nextSource, nextArgs, nextContext, nextInfo);
        };

        return middleware.call(this, next, source, args, context, info);
    };
}

export function applyMiddleware(schema: GraphQLSchema, ...middlewares: Middleware[]): GraphQLSchema {

    if(!middlewares.length){
        return schema;
    }

    // Isolate shared types before wrapping; merged schemas can reuse the original types.
    const wrappedSchema = mergeSchemas({ schemas: [schema] });

    for(const type of Object.values(wrappedSchema.getTypeMap())){

        if(!isObjectType(type) || type.name.startsWith('__')){
            continue;
        }

        const resolverName = type === wrappedSchema.getSubscriptionType() ? 'subscribe' : 'resolve';

        for(const field of Object.values(type.getFields())){

            let resolver = field[resolverName] || defaultFieldResolver;

            for(let index = middlewares.length - 1; index >= 0; index--){
                resolver = wrapResolver(resolver, middlewares[index]);
            }

            field[resolverName] = resolver;
        }
    }

    return wrappedSchema;
}
