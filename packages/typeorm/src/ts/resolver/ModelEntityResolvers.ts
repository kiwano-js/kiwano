import { EntityFieldType, type ResolverInfo } from "@kiwano/core";

import createRelationResolver, { type RelationResolverHooks, type RelationResolverOptions } from "./relation";

import AbstractModelResolvers from "./AbstractModelResolvers";
import type { EntityFieldInfo } from "./common";

export class ModelEntityResolvers<ModelType, SourceType=any> extends AbstractModelResolvers<ModelType, SourceType> implements RelationResolverHooks<ModelType, SourceType, object> {

    $executeResolver(resolverInfo: ResolverInfo<SourceType>, fieldInfo: EntityFieldInfo){

        switch(fieldInfo.entityFieldType){

            case EntityFieldType.RELATION:

                const relationResolver = createRelationResolver<ModelType, SourceType>(fieldInfo.resolverOptions as RelationResolverOptions, this);
                return relationResolver(resolverInfo.source, resolverInfo.args, resolverInfo.context, resolverInfo.info);
        }
    }
}

export default ModelEntityResolvers;