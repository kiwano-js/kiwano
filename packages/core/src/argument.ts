import { isString, clone } from 'lodash'

import { GraphQLArgumentConfig, GraphQLInputType } from "graphql/type/definition";
import { GraphQLNonNull, GraphQLList } from "graphql";

import Builder, { BuildContext, FinalizeContext, builderInfoExtensionName, BuilderName } from "./Builder";
import { Plugin } from "./plugin";
import { resolveType } from "./util";

export type ArgumentType = string | GraphQLInputType;

export interface ArgumentBuilderInfo {
    name: string
    type: ArgumentType
    description?: string
    extensions: Map<string, any>
    nonNull: boolean
    nonNullList: boolean
    list: boolean
    plugins: Plugin[]
}

export class ArgumentBuilder extends Builder<GraphQLArgumentConfig> {

    protected _type: ArgumentType;

    protected _description?: string;
    protected _extensions = new Map<string, any>();

    protected _nonNull: boolean = false;
    protected _nonNullList: boolean = false;
    protected _list: boolean = false;

    constructor(name: BuilderName, type: ArgumentType) {

        super(name);
        this.type(type);
    }

    type(type: ArgumentType){

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

        const info = this.info();

        await this._executePlugins('beforeFinalizeArgument', plugin => plugin.beforeFinalizeArgument(this, context, info));

        await this.finalizeArgument(context, info);

        await this._executePlugins('afterFinalizeArgument', plugin => plugin.afterFinalizeArgument(this, context, info));
    }

    async finalizeArgument(context: FinalizeContext, info: ArgumentBuilderInfo){}

    build(context: BuildContext): GraphQLArgumentConfig {

        this._executePluginsSync('beforeBuildArgument', plugin => plugin.beforeBuildArgument(this, context));

        let type = isString(this._type) ? context.getType(this._type) as GraphQLInputType : this._type;

        if(this._list){

            if(this._nonNullList){
                type = GraphQLNonNull(type);
            }

            type = GraphQLList(type);
        }

        if(this._nonNull){
            type = GraphQLNonNull(type);
        }

        const argument = {
            type,
            description: this._description,
            extensions: {
                [builderInfoExtensionName]: this.info(),
                ...Object.fromEntries(this._extensions)
            }
        }

        this._executePluginsSync('afterBuildArgument', plugin => plugin.afterBuildArgument(this, context, argument));

        return argument;
    }

    info(): ArgumentBuilderInfo {

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

export function argument(name: BuilderName, type: ArgumentType): ArgumentBuilder {

    return new ArgumentBuilder(name, type);
}

export default argument;