import { isInputObjectType, isListType, isNonNullType, type GraphQLInputType, type GraphQLResolveInfo } from 'graphql';

import { inputAclExtensionName, type InputFieldAcl } from '../../inputField';
import { ForbiddenError } from '../../error/resolver';
import type { AclPlugin, AclRoleIdentifier } from './acl';

export async function validateInputArguments(
    acl: AclPlugin,
    args: Record<string, unknown>,
    role: AclRoleIdentifier,
    info: GraphQLResolveInfo,
    onForbidden: (resource: string) => void
): Promise<void> {

    const field = info.parentType.getFields()[info.fieldName];

    async function validateValue(value: unknown, type: GraphQLInputType): Promise<void> {

        if(value === null || value === undefined){
            return;
        }

        if(isNonNullType(type)){
            await validateValue(value, type.ofType);
            return;
        }

        if(isListType(type)){

            for(const item of value as unknown[]){
                await validateValue(item, type.ofType);
            }

            return;
        }

        if(!isInputObjectType(type)){
            return;
        }

        const fields = type.getFields();

        for(const [name, fieldValue] of Object.entries(value as Record<string, unknown>)){

            const inputField = fields[name];
            if(!inputField){
                continue;
            }

            const policy = inputField.extensions?.[inputAclExtensionName] as InputFieldAcl | undefined;
            if(policy){

                let allowed = role !== null && role !== undefined;
                if(allowed && policy.allowedRoles.length > 0){
                    allowed = acl.isRoleIncluded(role, new Set(policy.allowedRoles));
                }

                if(allowed && policy.deniedRoles.length > 0){
                    allowed = !acl.isRoleIncluded(role, new Set(policy.deniedRoles));
                }

                if(!allowed){

                    const resource = `${type.name}.${name}`;
                    await onForbidden(resource);
                    throw new ForbiddenError(`No access to input ${resource}`);
                }
            }

            await validateValue(fieldValue, inputField.type);
        }
    }

    for(const argument of field.args){
        await validateValue(args[argument.name], argument.type);
    }
}
