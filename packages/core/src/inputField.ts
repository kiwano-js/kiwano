import { isString, clone } from 'lodash'

import { GraphQLInputFieldConfig, GraphQLInputType } from "graphql/type/definition";
import { GraphQLList, GraphQLNonNull } from "graphql";

import Builder, { BuildContext, FinalizeContext, BuilderName } from "./Builder";
import { Plugin } from "./plugin";
import { resolveType } from "./util";

export type InputFieldType = string | GraphQLInputType;

export interface InputFieldBuilderInfo {
    name: string
    type: InputFieldType
    description?: string
    extensions: Map<string, any>
    nonNull: boolean
    nonNullList: boolean
    list: boolean
    plugins: Plugin[]
}

export class InputFieldBuilder extends Builder<GraphQLInputFieldConfig> {

    protected _type: InputFieldType;

    protected _description?: string;
    protected _extensions = new Map<string, any>();

    protected _nonNull: boolean = false;
    protected _nonNullList: boolean = false;
    protected _list: boolean = false;

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

    nonNull(): this;
    nonNull(nonNull: boolean): this;
    nonNull(nonNull: boolean = true): this {

        this._nonNull = nonNull;
        return this;
    }

    list(): this;
    list(list: boolean): this;
    list(list: boolean = true): this {

        this._list = list;
        return this;
    }

    nonNullList(): this;
    nonNullList(nonNullList: boolean): this;
    nonNullList(nonNullList: boolean = true): this {

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
            plugins: clone(this._plugins)
        }
    }
}

export function inputField(name: BuilderName, type: InputFieldType): InputFieldBuilder {

    return new InputFieldBuilder(name, type);
}

export default inputField;