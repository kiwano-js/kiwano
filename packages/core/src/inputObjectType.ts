import { isString, clone } from 'lodash'

import { GraphQLInputObjectType } from "graphql";
import { GraphQLInputType } from "graphql/type/definition";

import { InputFieldBuilder, InputFieldType } from "./inputField";
import Builder, { BuildContext, BuilderName, BuilderError, FinalizeContext } from "./Builder";
import { Configurator } from "./common";
import { Plugin } from "./plugin";

export interface InputObjectTypeBuilderInfo {
    name: string
    description?: string
    fields: InputFieldBuilder[]
    extensions: Map<string, any>
    plugins: Plugin[]
}

export class InputObjectTypeBuilder extends Builder<GraphQLInputType> {

    protected _description?: string;

    protected _fields: InputFieldBuilder[] = [];
    protected _extensions = new Map<string, any>();

    description(description?: string): this {

        this._description = description;
        return this;
    }

    extension(name: string, value: any): this {

        this._extensions.set(name, value);
        return this;
    }

    field(name: string, type: InputFieldType, configurator: Configurator<InputFieldBuilder>): this;
    field(name: string, type: InputFieldType): this;
    field(field: InputFieldBuilder): this;
    field(fieldOrName: InputFieldBuilder | string, type: InputFieldType, configurator: Configurator<InputFieldBuilder>): this;
    field(fieldOrName: InputFieldBuilder | string, type: InputFieldType = null, configurator: Configurator<InputFieldBuilder> = null): this {

        let field: InputFieldBuilder = null;

        if(fieldOrName instanceof InputFieldBuilder){
            field = fieldOrName;
        }
        else if(isString(fieldOrName) && type){

            field = new InputFieldBuilder(fieldOrName, type);

            if(configurator){
                configurator(field);
            }
        }
        else {
            throw new BuilderError('Invalid input field provided', fieldOrName);
        }

        this._fields.push(field);
        return this;
    }

    async finalizeBuilder(context: FinalizeContext){

        const info = this.info();

        await this._executePlugins('beforeFinalizeInputObjectType', plugin => plugin.beforeFinalizeInputObjectType(this, context, info));

        await this.finalizeInputObjectType(context, info);

        await this._executePlugins('afterFinalizeInputObjectType', plugin => plugin.afterFinalizeInputObjectType(this, context, info));

        // Add plugins to fields
        for(let field of this._fields){
            this._plugins.forEach(plugin => field.use(plugin));
        }

        for(let field of this._fields){
            await field.finalize(context);
        }
    }

    async finalizeInputObjectType(context: FinalizeContext, info: InputObjectTypeBuilderInfo){}

    build(context: BuildContext): GraphQLInputObjectType {

        const info = this.info();

        this._executePluginsSync('beforeBuildInputObjectType', plugin => plugin.beforeBuildInputObjectType(this, context, info));

        const inputObjectType = new GraphQLInputObjectType({
            name: this.name,
            description: this._description,
            extensions: {
                ...Object.fromEntries(this._extensions)
            },
            fields: () => {

                let builtFields = {};

                for(let field of this._fields){
                    builtFields[field.name] = field.build(context);
                }

                return builtFields;
            }
        });

        this._executePluginsSync('afterBuildInputObjectType', plugin => plugin.afterBuildInputObjectType(this, context, info, inputObjectType));

        return inputObjectType;
    }

    info(): InputObjectTypeBuilderInfo {

        return {
            name: this.name,
            description: this._description,
            fields: clone(this._fields),
            extensions: new Map(this._extensions),
            plugins: clone(this._plugins)
        }
    }
}

export function inputObjectType(name: BuilderName): InputObjectTypeBuilder {

    return new InputObjectTypeBuilder(name);
}

export default inputObjectType;