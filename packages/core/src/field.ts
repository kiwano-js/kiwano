import isString from 'lodash/isString'
import clone from 'lodash/clone'

import { GraphQLFieldConfig, GraphQLFieldResolver } from "graphql/type/definition";
import { GraphQLOutputType, GraphQLNonNull, GraphQLList } from "graphql";

import { ArgumentBuilder, ArgumentType } from "./argument";
import { ObjectTypeBuilder } from "./objectType";
import Builder, { BuildContext, FinalizeContext, BuilderName, BuilderError, builderInfoExtensionName } from "./Builder";
import { Configurator } from "./common";
import { Plugin } from "./plugin";
import { resolveType } from "./util";

export interface FieldBuilderInfo {
    name: string
    type: FieldType
    description?: string
    arguments: ArgumentBuilder[],
    extensions: Map<string, any>
    nonNull: boolean
    nonNullList: boolean
    list: boolean
    allowedRoles: Set<string>
    deniedRoles: Set<string>
    plugins: Plugin[]
    resolver?: GraphQLFieldResolver<any, any>
}

export type FieldType = string | GraphQLOutputType;

export class FieldBuilder extends Builder<GraphQLFieldConfig<any, any>> {

    protected _type: FieldType;

    protected _description?: string;
    protected _arguments: ArgumentBuilder[] = [];

    protected _extensions = new Map<string, any>();

    protected _nonNull: boolean = false;
    protected _nonNullList: boolean = false;
    protected _list: boolean = false;

    protected _allowedRoles = new Set<string>();
    protected _deniedRoles = new Set<string>();

    protected _resolver?: GraphQLFieldResolver<any, any>;

    constructor(name: BuilderName, type: FieldType = null) {

        super(name);
        this.type(type);
    }

    type(type: FieldType){

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

    arg(name: string, type: ArgumentType, configurator: Configurator<ArgumentBuilder>): this;
    arg(name: string, type: ArgumentType): this;
    arg(arg: ArgumentBuilder): this;
    arg(argOrName: ArgumentBuilder | string, type: ArgumentType, configurator: Configurator<ArgumentBuilder>);
    arg(argOrName: ArgumentBuilder | string, type: ArgumentType = null, configurator: Configurator<ArgumentBuilder> = null): this {

        let argument: ArgumentBuilder = null;

        if(argOrName instanceof ArgumentBuilder){
            argument = argOrName;
        }
        else if(isString(argOrName) && type){

            argument = new ArgumentBuilder(argOrName, type);

            if(configurator){
                configurator(argument);
            }
        }
        else {
            throw new BuilderError('Invalid argument provided', argOrName);
        }

        this._arguments.push(argument);
        return this;
    }

    nonNull(): this;
    nonNull(nonNull: boolean);
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

    resolver(resolver: GraphQLFieldResolver<any, any>): this {

        this._resolver = resolver;
        return this;
    }

    allow(...roles: string[]): this {

        roles.forEach(role => this._allowedRoles.add(role));
        return this;
    }

    deny(...roles: string[]): this {

        roles.forEach(role => this._deniedRoles.add(role));
        return this;
    }

    async finalizeBuilder(context: FinalizeContext){

        const info = this.info();

        await this._executePlugins('beforeFinalizeField', plugin => plugin.beforeFinalizeField(this, context, info));

        await this.finalizeField(context, info);

        await this._executePlugins('afterFinalizeField', plugin => plugin.afterFinalizeField(this, context, info));

        // Add plugins to arguments
        for(let arg of this._arguments){
            this._plugins.forEach(plugin => arg.use(plugin));
        }

        for(let argument of this._arguments){
            await argument.finalize(context);
        }
    }

    async finalizeField(context: FinalizeContext, info: FieldBuilderInfo){}

    build(context: BuildContext, parentBuilder?: ObjectTypeBuilder): GraphQLFieldConfig<any, any> {

        if(!parentBuilder){
            throw new BuilderError('Build: Field needs parent builder argument to be present');
        }

        this._executePluginsSync('beforeBuildField', plugin => plugin.beforeBuildField(this, context));

        let builtArgs = {};

        for(let arg of this._arguments){
            builtArgs[arg.name] = arg.build(context);
        }

        let type = isString(this._type) ? context.getType(this._type) as GraphQLOutputType : this._type;
        if(type === null){
            throw new BuilderError(`Type "${this._type}" of field "${this.name}" not found`);
        }

        if(this._list){

            if(this._nonNullList){
                type = GraphQLNonNull(type);
            }

            type = GraphQLList(type);
        }

        if(this._nonNull){
            type = GraphQLNonNull(type);
        }

        const resolver = this._resolver || context.getResolver(parentBuilder.name, this.name);

        const field = {
            type,
            description: this._description,
            args: builtArgs,
            extensions: {
                allowedRoles: Array.from(this._allowedRoles),
                deniedRoles: Array.from(this._deniedRoles),
                [builderInfoExtensionName]: this.info(),
                ...Object.fromEntries(this._extensions)
            },
            resolve: resolver
        }

        this._executePluginsSync('afterBuildField', plugin => plugin.afterBuildField(this, context, field));

        return field;
    }

    info(): FieldBuilderInfo {

        return {
            name: this.name,
            type: this._type,
            description: this._description,
            arguments: clone(this._arguments),
            extensions: new Map(this._extensions),
            nonNull: this._nonNull,
            nonNullList: this._nonNullList,
            list: this._list,
            allowedRoles: new Set(this._allowedRoles),
            deniedRoles: new Set(this._deniedRoles),
            resolver: this._resolver,
            plugins: clone(this._plugins)
        }
    }
}

export function field(name: BuilderName, type: FieldType = null): FieldBuilder {

    return new FieldBuilder(name, type);
}

export default field;