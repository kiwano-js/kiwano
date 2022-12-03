import { isFunction } from 'lodash'

import { defaultFieldResolver, GraphQLResolveInfo } from "graphql";

import {
    AnyObject,
    builderInfoExtensionName, EntityFieldType,
    entityFieldTypeExtensionName, FieldBuilderInfo,
    ResolverError,
    ResolverInfo
} from '@kiwano/core';

import { resolverOptionsExtensionName } from "../modelSchema";
import { EntityFieldInfo } from "./common";

export default abstract class AbstractModelResolvers<ModelType, SourceType=any> {

    constructor(){

        return new Proxy(this, {

            get(target, property){

                // Return resolver when available
                if(target[property]){
                    return target[property];
                }

                return (source: SourceType, args: AnyObject, context: any, info: GraphQLResolveInfo) => {

                    // Return default result when available; automatic resolver is only executed when value is not found in source
                    const defaultResult = defaultFieldResolver(source, args, context, info);
                    if(defaultResult && !(defaultResult instanceof Promise)){
                        return defaultResult;
                    }

                    const parentFields = info.parentType.getFields();
                    const fieldType = parentFields[info.fieldName];

                    if(fieldType){

                        const fieldInfo = fieldType.extensions[builderInfoExtensionName] as FieldBuilderInfo;
                        const entityFieldType = fieldType.extensions[entityFieldTypeExtensionName] as EntityFieldType;

                        if(fieldInfo && entityFieldType){

                            let resolverOptions = fieldType.extensions[resolverOptionsExtensionName];
                            if(isFunction(resolverOptions)){
                                resolverOptions = resolverOptions();
                            }

                            if(!resolverOptions){
                                throw new ResolverError(`Resolver options missing for field '${info.fieldName}'`);
                            }

                            return target.$executeResolver({ source, args, context, info }, {
                                entityFieldType,
                                resolverOptions,
                                fieldInfo
                            });
                        }
                    }

                    return defaultResult;
                }
            }
        });
    }

    abstract $executeResolver(info: ResolverInfo<SourceType>, fieldInfo: EntityFieldInfo);
}