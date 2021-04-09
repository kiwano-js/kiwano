import { EntityFieldType, ResolverInfo } from "@kiwano/core";

import createCreateResolver, { CreateResolverHooks, CreateResolverOptions } from "./create";
import createUpdateResolver, { UpdateResolverHooks, UpdateResolverOptions } from "./update";
import createDeleteResolver, { DeleteResolverHooks, DeleteResolverOptions } from "./delete";

import AbstractModelResolvers from "./AbstractModelResolvers";
import { EntityFieldInfo } from "./common";

export class ModelMutationResolvers<ModelType, SourceType=any> extends AbstractModelResolvers<ModelType, SourceType> implements CreateResolverHooks<ModelType, SourceType>, UpdateResolverHooks<ModelType, SourceType>, DeleteResolverHooks<ModelType, SourceType> {

    $executeResolver(resolverInfo: ResolverInfo<SourceType>, fieldInfo: EntityFieldInfo){

        switch(fieldInfo.entityFieldType){

            case EntityFieldType.CREATE:

                const createResolver = createCreateResolver<ModelType, SourceType>(fieldInfo.resolverOptions as CreateResolverOptions, this);
                return createResolver(resolverInfo.source, resolverInfo.args, resolverInfo.context, resolverInfo.info);

            case EntityFieldType.UPDATE:

                const updateResolver = createUpdateResolver<ModelType, SourceType>(fieldInfo.resolverOptions as UpdateResolverOptions, this);
                return updateResolver(resolverInfo.source, resolverInfo.args, resolverInfo.context, resolverInfo.info);

            case EntityFieldType.DELETE:

                const deleteResolver = createDeleteResolver<ModelType, SourceType>(fieldInfo.resolverOptions as DeleteResolverOptions, this);
                return deleteResolver(resolverInfo.source, resolverInfo.args, resolverInfo.context, resolverInfo.info);
        }
    }
}

export default ModelMutationResolvers;