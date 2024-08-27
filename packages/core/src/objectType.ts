import { clone, isString } from 'lodash'

import { GraphQLObjectType } from "graphql";

import { FieldBuilder, FieldType } from "./field";
import Builder, { BuildContext, BuilderName, BuilderError, FinalizeContext } from "./Builder";
import { Configurator } from "./common";
import { Plugin } from "./plugin";

export interface ObjectTypeBuilderInfo {
    name: string
    description?: string
    fields: FieldBuilder[],
    extensions: Map<string, any>
    allowedRoles: Set<string>
    deniedRoles: Set<string>
    plugins: Plugin[]
    resolvers?: object
}

export class ObjectTypeBuilder extends Builder<GraphQLObjectType> {

    protected _description?: string;

    protected _fields: FieldBuilder[] = [];
    protected _extensions = new Map<string, any>();

    protected _allowedRoles = new Set<string>();
    protected _deniedRoles = new Set<string>();

    protected _resolvers?: object;

    description(description?: string): this {

        this._description = description;
        return this;
    }

    extension(name: string, value: any): this {

        this._extensions.set(name, value);
        return this;
    }

    resolvers(resolvers: object): this {

        this._resolvers = resolvers;
        return this;
    }

    getResolvers(): object {

        return this._resolvers;
    }

    field(name: string, type: FieldType, configurator: Configurator<FieldBuilder>): this;
    field(name: string, type: FieldType): this;
    field(field: FieldBuilder): this;
    field(fieldOrName: FieldBuilder | string, type: FieldType, configurator: Configurator<FieldBuilder>): this;
    field(fieldOrName: FieldBuilder | string, type: FieldType = null, configurator: Configurator<FieldBuilder> = null): this {

        let field: FieldBuilder = null;

        if(fieldOrName instanceof FieldBuilder){
            field = fieldOrName;
        }
        else if(isString(fieldOrName) && type){

            field = new FieldBuilder(fieldOrName, type);

            if(configurator){
                configurator(field);
            }
        }
        else {
            throw new BuilderError('Invalid field provided', fieldOrName);
        }

        this._fields.push(field);
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

        await this._executePlugins('beforeFinalizeObjectType', plugin => plugin.beforeFinalizeObjectType(this, context, info));

        await this.finalizeObjectType(context, info);

        await this._executePlugins('afterFinalizeObjectType', plugin => plugin.afterFinalizeObjectType(this, context, info));

        // Add plugins to fields
        for(let field of this._fields){
            this._plugins.forEach(plugin => field.use(plugin));
        }

        for(let field of this._fields){
            await field.finalize(context);
        }
    }

    async finalizeObjectType(context: FinalizeContext, info: ObjectTypeBuilderInfo){}

    build(context: BuildContext): GraphQLObjectType {

        const info = this.info();

        this._executePluginsSync('beforeBuildObjectType', plugin => plugin.beforeBuildObjectType(this, context, info));

        const objectType = new GraphQLObjectType({
            name: this.name,
            description: this._description,
            extensions: {
                allowedRoles: Array.from(this._allowedRoles),
                deniedRoles: Array.from(this._deniedRoles),
                ...Object.fromEntries(this._extensions)
            },
            fields: () => {

                let builtFields = {};

                for(let field of this._fields){
                    builtFields[field.name] = field.build(context, this);
                }

                return builtFields;
            }
        });

        this._executePluginsSync('afterBuildObjectType', plugin => plugin.afterBuildObjectType(this, context, info, objectType));

        return objectType;
    }

    info(): ObjectTypeBuilderInfo {

        return {
            name: this.name,
            description: this._description,
            fields: clone(this._fields),
            extensions: new Map(this._extensions),
            allowedRoles: new Set(this._allowedRoles),
            deniedRoles: new Set(this._deniedRoles),
            resolvers: this._resolvers,
            plugins: clone(this._plugins)
        }
    }
}

export function objectType(name: BuilderName): ObjectTypeBuilder {

    return new ObjectTypeBuilder(name);
}

export default objectType;