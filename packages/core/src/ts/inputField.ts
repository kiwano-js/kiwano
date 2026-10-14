import { isString, clone } from 'es-toolkit/compat'

import type { GraphQLInputFieldConfig, GraphQLInputType } from "graphql/type/definition";
import { GraphQLList, GraphQLNonNull } from "graphql";

import Builder, { type BuildContext, type FinalizeContext, type BuilderName } from "./Builder";
import type { Plugin } from "./plugin";
import { resolveType } from "./util";

export type InputFieldType = string | GraphQLInputType;

export const inputAclExtensionName = '$inputAcl';

export interface InputFieldAcl {
    allowedRoles: (string | number)[]
    deniedRoles: (string | number)[]
}

export interface InputFieldBuilderInfo {
    name: string
    type: InputFieldType
    description?: string
    extensions: Map<string, any>
    nonNull: boolean
    nonNullList: boolean
    list: boolean
    plugins: Plugin[]
    allowedRoles: Set<string | number>
    deniedRoles: Set<string | number>
}

export class InputFieldBuilder extends Builder<GraphQLInputFieldConfig> {

    protected _type: InputFieldType;

    protected _description?: string;
    protected _extensions = new Map<string, any>();

    protected _allowedRoles = new Set<string | number>();
    protected _deniedRoles = new Set<string | number>();

    protected _nonNull = false;
    protected _nonNullList = false;
    protected _list = false;

    constructor(name: BuilderName, type: InputFieldType) {

        super(name);
        this.type(type);
    }

    type(type: InputFieldType){

        const resolvedType = resolveType(type);

        this._type = resolvedType.type;

        if(resolvedType.nonNull) this.nonNull();
        if(resolvedType.list) this.list();
        if(resolvedType.nonNullList) this.nonNullList();

        return this;
    }

    description(description?: string): this {

        this._description = description;
        return this;
    }

    extension(name: string, value: any): this {

        this._extensions.set(name, value);
        return this;
    }

    allow(...roles: (string | number)[]): this {

        for(const role of roles){
            this._allowedRoles.add(role);
        }
        return this;
    }

    deny(...roles: (string | number)[]): this {

        for(const role of roles){
            this._deniedRoles.add(role);
        }
        return this;
    }

    nonNull(): this;
    nonNull(nonNull: boolean): this;
    nonNull(nonNull = true): this {

        this._nonNull = nonNull;
        return this;
    }

    list(): this;
    list(list: boolean): this;
    list(list = true): this {

        this._list = list;
        return this;
    }

    nonNullList(): this;
    nonNullList(nonNullList: boolean): this;
    nonNullList(nonNullList = true): this {

        if(nonNullList){
            this.list();
        }

        this._nonNullList = nonNullList;
        return this;
    }

    async finalizeBuilder(context: FinalizeContext){

        const info = this.info()

        await this._executePlugins('beforeFinalizeInputField', plugin => plugin.beforeFinalizeInputField(this, context, info));

        await this.finalizeInputField(context, info);

        await this._executePlugins('afterFinalizeInputField', plugin => plugin.afterFinalizeInputField(this, context, info));
    }

    async finalizeInputField(context: FinalizeContext, info: InputFieldBuilderInfo) {}

    build(context: BuildContext): GraphQLInputFieldConfig {

        const info = this.info();

        this._executePluginsSync('beforeBuildInputField', plugin => plugin.beforeBuildInputField(this, context, info));

        let type = isString(this._type) ? context.getType(this._type) as GraphQLInputType : this._type;

        if(this._list){

            if(this._nonNullList){
                type = new GraphQLNonNull(type);
            }

            type = new GraphQLList(type);
        }

        if(this._nonNull){
            type = new GraphQLNonNull(type);
        }

        const inputField = {
            type,
            description: this._description,
            extensions: {
                ...(this._allowedRoles.size > 0 || this._deniedRoles.size > 0 ? {
                    [inputAclExtensionName]: {
                        allowedRoles: Array.from(this._allowedRoles),
                        deniedRoles: Array.from(this._deniedRoles)
                    } satisfies InputFieldAcl
                } : {}),
                ...Object.fromEntries(this._extensions)
            }
        }

        this._executePluginsSync('afterBuildInputField', plugin => plugin.afterBuildInputField(this, context, info, inputField));

        return inputField;
    }

    info(): InputFieldBuilderInfo {

        return {
            name: this.name,
            type: this._type,
            description: this._description,
            extensions: new Map(this._extensions),
            nonNull: this._nonNull,
            nonNullList: this._nonNullList,
            list: this._list,
            plugins: clone(this._plugins),
            allowedRoles: new Set(this._allowedRoles),
            deniedRoles: new Set(this._deniedRoles)
        }
    }
}

export function inputField(name: BuilderName, type: InputFieldType): InputFieldBuilder {

    return new InputFieldBuilder(name, type);
}

export default inputField;
