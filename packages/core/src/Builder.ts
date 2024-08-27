import { isFunction } from 'lodash'

import { GraphQLScalarType, GraphQLType } from "graphql";
import { GraphQLFieldResolver } from "graphql/type/definition";

import { Plugin } from "./plugin";
import FrameworkError from "./error/FrameworkError";
import { Configurator, OptionalPromise } from "./common";
import { AbstractSchemaBuilder } from "./schema";

export class BuilderError extends FrameworkError {}

export type BuilderOrConfiguratorOrName<T> = T | Configurator<T> | string;
export type BuilderName = string | (() => string);

export default abstract class Builder<RT> {

    protected _name?: BuilderName;
    protected _plugins: Plugin[] = [];

    protected _finalized = false;

    constructor(name: BuilderName=null) {

        this._name = name;
    }

    use(...plugins: Plugin[]): this {

        plugins.forEach(plugin => this._plugins.push(plugin));
        return this;
    }

    protected async _executePlugins(methodName: string, fn: (plugin: Plugin) => OptionalPromise){

        for(let plugin of this._plugins){

            if(plugin[methodName]){
                await fn(plugin);
            }
        }
    }

    protected _executePluginsSync(methodName: string, fn: (plugin: Plugin) => void){

        for(let plugin of this._plugins){

            if(plugin[methodName]){
                fn(plugin);
            }
        }
    }

    get name(): string {

        return resolveName(this._name);
    }

    async finalize(context: FinalizeContext): Promise<void> {

        if(this._finalized){
            return;
        }

        await this.finalizeBuilder(context);
        this._finalized = true;
    }

    abstract finalizeBuilder(context: FinalizeContext): Promise<void>;

    abstract build(context: BuildContext, parentBuilder?: Builder<any>): RT;
}

export class BuildContext {

    protected resolvedTypes: Map<string, GraphQLType>

    schema: AbstractSchemaBuilder<any>
    rootSchema: AbstractSchemaBuilder<any>

    constructor(schema: AbstractSchemaBuilder<any>, rootSchema: AbstractSchemaBuilder<any>, resolvedTypes: Map<string, GraphQLType>) {

        this.schema = schema;
        this.rootSchema = rootSchema;

        this.resolvedTypes = resolvedTypes;
    }

    getType(name: string): GraphQLType {

        if(this.resolvedTypes.has(name)){
            return this.resolvedTypes.get(name);
        }

        const typeResult = this.schema.locateType(name, false) ?? this.rootSchema.locateType(name, true);
        if(!typeResult){
            return null;
        }

        const { type, schema } = typeResult;
        let resolvedType: GraphQLType = null;

        if(type instanceof Builder){

            let context: BuildContext = this;
            if(schema != this.schema){
                context = new BuildContext(schema, this.rootSchema, this.resolvedTypes);
            }

            resolvedType = type.build(context);
        }
        else if(type instanceof GraphQLScalarType){
            resolvedType = type;
        }

        if(!resolvedType){
            throw new BuilderError(`Type ${name} not found`);
        }

        this.resolvedTypes.set(name, resolvedType);
        return resolvedType;
    }

    getResolver(typeName, fieldName): GraphQLFieldResolver<any, any> {

        return this.schema.findResolver(typeName, fieldName);
    }
}

export class FinalizeContext {

    schema: AbstractSchemaBuilder<any>
    rootSchema: AbstractSchemaBuilder<any>

    constructor(schema: AbstractSchemaBuilder<any>, rootSchema: AbstractSchemaBuilder<any>) {

        this.schema = schema;
        this.rootSchema = rootSchema;
    }

    async getType(name: string): Promise<Builder<any> | GraphQLScalarType> {

        const typeResult = this.schema.locateType(name, false) ?? this.rootSchema.locateType(name, true);
        if(!typeResult){
            return null;
        }

        const { type, schema } = typeResult;

        if(type instanceof Builder){

            let context: FinalizeContext = this;
            if(schema != this.schema){
                context = new FinalizeContext(schema, this.rootSchema);
            }

            await type.finalize(context);
        }

        return type;
    }
}

export function resolveName(name: BuilderName): string {

    return isFunction(name) ? name() : name as string;
}