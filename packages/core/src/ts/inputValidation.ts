import {
    defaultFieldResolver,
    getNamedType,
    type GraphQLInputObjectType,
    type GraphQLInputType,
    type GraphQLSchema,
    isInputObjectType,
    isListType,
    isNonNullType,
    isObjectType
} from "graphql";

import { InvalidInputError } from "./error/resolver/InvalidInputError";
import type { Middleware } from "./common";
import { wrapResolver } from "./resolver";

export const rejectNullExtensionName = 'kiwanoRejectNull';

export function applyInputValidation(schema: GraphQLSchema): void {

    for(const type of Object.values(schema.getTypeMap())){

        if(!isObjectType(type) || type.name.startsWith('__')){
            continue;
        }

        for(const field of Object.values(type.getFields())){

            const args = field.args.filter(arg => hasRejectNull(arg.type, new Set()));
            if(!args.length){
                continue;
            }

            const validateInput: Middleware = (resolve, source, values, context, info) => {

                for(const arg of args){
                    validateInputValue(values[arg.name], arg.type, arg.name);
                }

                return resolve(source, values, context, info);
            };

            if(type === schema.getSubscriptionType()){
                field.subscribe = wrapResolver(field.subscribe || defaultFieldResolver, validateInput);
            }
            else {
                field.resolve = wrapResolver(field.resolve || defaultFieldResolver, validateInput);
            }
        }
    }
}

function hasRejectNull(type: GraphQLInputType, visited: Set<GraphQLInputObjectType>): boolean {

    const namedType = getNamedType(type);
    if(!isInputObjectType(namedType) || visited.has(namedType)){
        return false;
    }

    visited.add(namedType);

    return Object.values(namedType.getFields()).some(field =>
        field.extensions?.[rejectNullExtensionName] === true || hasRejectNull(field.type, visited)
    );
}

function validateInputValue(value: unknown, type: GraphQLInputType, path: string): void {

    if(value == null){
        return;
    }

    if(isNonNullType(type)){
        validateInputValue(value, type.ofType, path);
        return;
    }

    if(isListType(type)){

        (value as unknown[]).forEach((item, index) => {
            validateInputValue(item, type.ofType, `${path}[${index}]`);
        });

        return;
    }

    if(!isInputObjectType(type)){
        return;
    }

    const input = value as Record<string, unknown>;

    for(const field of Object.values(type.getFields())){

        const fieldValue = input[field.name];
        const fieldPath = `${path}.${field.name}`;

        if(fieldValue === null && field.extensions?.[rejectNullExtensionName] === true){
            throw new InvalidInputError(`Input field "${fieldPath}" must not be null`, { inputPath: fieldPath });
        }

        validateInputValue(fieldValue, field.type, fieldPath);
    }
}
