import { EntityFieldType, type ResolverInfo } from "@kiwano/core";

import createFindResolver, { type FindResolverHooks, type FindResolverOptions } from "./find";
import createAllResolver, { type AllResolverHooks, type AllResolverOptions } from "./all";

import AbstractModelResolvers from "./AbstractModelResolvers";
import type { EntityFieldInfo } from "./common";

export class ModelQueryResolvers<ModelType, SourceType=any> extends AbstractModelResolvers<ModelType, SourceType> implements FindResolverHooks<ModelType, SourceType>, AllResolverHooks<ModelType, SourceType> {

    $executeResolver(resolverInfo: ResolverInfo<SourceType>, fieldInfo: EntityFieldInfo){

        switch(fieldInfo.entityFieldType){

            case EntityFieldType.FIND:

                const findResolver = createFindResolver<ModelType, SourceType>(fieldInfo.resolverOptions as FindResolverOptions, this);
                return findResolver(resolverInfo.source, resolverInfo.args, resolverInfo.context, resolverInfo.info);

            case EntityFieldType.ALL:

                const allResolver = createAllResolver<ModelType, SourceType>(fieldInfo.resolverOptions as AllResolverOptions, this);
                return allResolver(resolverInfo.source, resolverInfo.args, resolverInfo.context, resolverInfo.info);
        }
    }
}

export default ModelQueryResolvers;