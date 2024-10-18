import { isString, isFunction } from "lodash";

import { GraphQLScalarType } from "graphql";
import { GraphQLEnumType } from "graphql/type/definition";

import { BuilderOrConfiguratorOrName } from "./Builder";
import { FieldBuilderInfo, FieldType } from "./field";
import { AbstractSchemaBuilder } from "./schema";
import { EnumTypeBuilder } from "./enumType";
import { InputObjectTypeBuilder } from "./inputObjectType";
import { Configurator } from "./common";

export const defaultScalarNames = ['Int', 'Float', 'String', 'Boolean', 'ID'];

export interface BuilderArgs<T> {
    builder: T
    name: string
    configurator: Configurator<T>
}

export interface ResolvedType {
    type: string | any
    nonNull: boolean
    list: boolean
    nonNullList: boolean
}

export function resolveAutoBuilderArgs<T>(builderOrConfiguratorOrName: BuilderOrConfiguratorOrName<T>, configuratorArg: Configurator<T>, builderType): BuilderArgs<T> {

    let builder: T = null;
    let name: string = null;
    let configurator: Configurator<T> = null;

    if(builderOrConfiguratorOrName instanceof builderType) {

        builder = builderOrConfiguratorOrName as T;
        configurator = configuratorArg;
    }
    else if(isString(builderOrConfiguratorOrName)){

        name = builderOrConfiguratorOrName as string;
        configurator = configuratorArg;
    }
    else {
        configurator = builderOrConfiguratorOrName as Configurator<T>;
    }

    return {
        builder, name, configurator
    }
}

export function resolveBuilderArgs<T>(builderOrName: T | string, configuratorArg: Configurator<T>, builderType): BuilderArgs<T> {

    let builder: T = null;
    let name: string = null;
    let configurator: Configurator<T> = null;

    if(builderOrName instanceof builderType) {

        builder = builderOrName as T;
        configurator = configuratorArg;
    }
    else if(isString(builderOrName)){

        name = builderOrName as string;
        configurator = configuratorArg;
    }

    return {
        builder, name, configurator
    }
}

export function resolveBuilder<V>(args: BuilderArgs<V>, defaultBuilderGenerator: (name?: string) => V): V {

    let resolvedBuilder = args.builder;

    if(!resolvedBuilder){
        resolvedBuilder = defaultBuilderGenerator(args.name);
    }

    if(args.configurator){
        args.configurator(resolvedBuilder);
    }

    return resolvedBuilder;
}

const nonNullTypePattern = /(.+)!$/
const nonNullListTypePattern = /\[(.+)!]/
const listTypePattern = /\[(.+)]/
const baseTypePattern = /\[?(\w+)]?!?/

export function resolveType(type: string | any): ResolvedType {

    if(!isString(type)){
        return { type, nonNull: false, nonNullList: false, list: false };
    }

    const nonNull = nonNullTypePattern.test(type)
    const nonNullList = nonNullListTypePattern.test(type)
    const list = listTypePattern.test(type);
    const baseMatches = baseTypePattern.exec(type);

    return { nonNull, list, nonNullList, type: baseMatches[1] };
}

export function isTypeInput(type: FieldType, schema: AbstractSchemaBuilder<any>): boolean {

    if(isString(type)){

        const typeName = type as string;

        if(defaultScalarNames.indexOf(typeName) >= 0){
            return true;
        }
        else {

            const builderType = schema.findType(typeName, true);
            if(builderType && (builderType instanceof EnumTypeBuilder || builderType instanceof GraphQLScalarType || builderType instanceof InputObjectTypeBuilder)){
                return true;
            }
        }
    }
    else if(type instanceof GraphQLScalarType || type instanceof GraphQLEnumType){
        return true;
    }

    return false;
}

export function isTypeScalar(type: FieldType, schema: AbstractSchemaBuilder<any>): boolean {

    if(isString(type)){

        const typeName = type as string;

        if(defaultScalarNames.indexOf(typeName) >= 0){
            return true;
        }
        else {

            const builderType = schema.findType(typeName, true);
            if(builderType && builderType instanceof GraphQLScalarType){
                return true;
            }
        }
    }
    else if(type instanceof GraphQLScalarType){
        return true;
    }

    return false;
}

export function isFieldId(info: FieldBuilderInfo): boolean {

    return info.type === 'ID' && info.name === 'id';
}

export function ensureInstantiated(input: object, ...args){

    if(isFunction(input)){

        try {
            let inputClass = input as any
            return new inputClass(...args);
        }
        catch {
            // Silence
        }
    }

    return input;
}

export function getAclExtension(allowed: Set<string>, denied: Set<string>) {

    return {
        allowedRoles: Array.from(allowed).join(','),
        deniedRoles: Array.from(denied).join(','),
    }
}

export function camelize(text) {

    return text.replace(/^([A-Z])|[\s-_]+(\w)/g, function(match, p1, p2) {
        if (p2) return p2.toUpperCase();
        return p1.toLowerCase();
    });
}