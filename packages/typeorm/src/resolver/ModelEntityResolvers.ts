import { EntityFieldType, ResolverInfo } from "@kiwano/core";

import createRelationResolver, { RelationResolverHooks, RelationResolverOptions } from "./relation";

import AbstractModelResolvers from "./AbstractModelResolvers";
import { EntityFieldInfo } from "./common";

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