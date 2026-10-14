import { getNamedType, isObjectType, type GraphQLNamedType, type GraphQLObjectType } from 'graphql';
import { aclFieldValidatorExtensionName, type AclFieldValidator, ForbiddenError } from '@kiwano/core';

import type { AllResolverInfo, RelationResolverInfo } from '../resolver';

type PredicateInfo = AllResolverInfo<any> | RelationResolverInfo<any>;

export function isPredicateFieldAllowed(info: PredicateInfo, fields: string[], relation?: string): boolean {

    const execution = info.info;
    const validate = execution?.schema.extensions?.[aclFieldValidatorExtensionName] as AclFieldValidator | undefined;
    if(!validate){
        return true;
    }

    let type: GraphQLNamedType = getNamedType(execution.returnType);
    if(!isObjectType(type)){
        return false;
    }

    if(type.name.endsWith('List') && type.getFields().items){
        type = getNamedType(type.getFields().items.type);
    }
    else if(type.name.endsWith('Connection') && type.getFields().edges){

        const edge = getNamedType(type.getFields().edges.type);
        if(isObjectType(edge) && edge.getFields().node){
            type = getNamedType(edge.getFields().node.type);
        }
    }

    if(!isObjectType(type)){
        return false;
    }

    let target: GraphQLObjectType = type;

    if(relation){

        const field = target.getFields()[relation];
        if(!field || !validate(info.context, target.name, relation)){
            return false;
        }

        const relationType = getNamedType(field.type);
        if(!isObjectType(relationType)){
            return false;
        }

        target = relationType;
    }

    return fields.every(name => !!target.getFields()[name] && validate(info.context, target.name, name));
}

export function assertPredicateFieldAccess(info: PredicateInfo, fields: string[], relation?: string): void {

    if(!isPredicateFieldAllowed(info, fields, relation)){
        throw new ForbiddenError(`No access to predicate ${relation ? `${relation}.` : ''}${fields.join(', ')}`);
    }
}
