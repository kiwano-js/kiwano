import { isString, clone } from 'lodash'

import { GraphQLEnumType } from "graphql/type/definition";

import Builder, { BuildContext, FinalizeContext, BuilderName, BuilderError } from "./Builder";
import { EnumValueBuilder } from "./enumValue";
import { Configurator } from "./common";
import { Plugin } from "./plugin";

export interface EnumTypeBuilderInfo {
    name: string
    description?: string
    values: EnumValueBuilder[]
    extensions: Map<string, any>
    plugins: Plugin[]
}

export class EnumTypeBuilder extends Builder<GraphQLEnumType> {

    protected _description?: string;
    protected _values: EnumValueBuilder[] = [];

    protected _extensions = new Map<string, any>();

    constructor(name: BuilderName, valuesObject: object = null) {

        super(name);

        if(valuesObject){
            this.valuesObject(valuesObject);
        }
    }

    description(description?: string): this {

        this._description = description;
        return this;
    }

    extension(name: string, value: any): this {

        this._extensions.set(name, value);
        return this;
    }

    value(name: string, value: any, configurator: Configurator<EnumValueBuilder>): this;
    value(name: string, value: any): this;
    value(name: string): this;
    value(builder: EnumValueBuilder): this;
    value(builderOrName: EnumValueBuilder | string, value: any, configurator: Configurator<EnumValueBuilder>): this;
    value(builderOrName: EnumValueBuilder | string, value: any = null, configurator: Configurator<EnumValueBuilder> = null): this {

        let valueBuilder: EnumValueBuilder = null;

        if(builderOrName instanceof EnumValueBuilder){
            valueBuilder = builderOrName;
        }
        else if(isString(builderOrName)){

            valueBuilder = new EnumValueBuilder(builderOrName, value);

            if(configurator){
                configurator(valueBuilder);
            }
        }
        else {
            throw new BuilderError('Invalid value provided', builderOrName);
        }

        this._values.push(valueBuilder);
        return this;
    }

    valuesObject(object: object){

        const keys = Object.keys(object).filter(key => isNaN(parseInt(key)));

        for(let key of keys){
            this.value(key, object[key]);
        }
    }

    async finalizeBuilder(context: FinalizeContext){

        const info = this.info();

        await this._executePlugins('beforeFinalizeEnumType', plugin => plugin.beforeFinalizeEnumType(this, context, info));

        await this.finalizeEnumType(context, info);

        await this._executePlugins('afterFinalizeEnumType', plugin => plugin.afterFinalizeEnumType(this, context, info));

        // Add plugins to values
        for(let value of this._values){
            this._plugins.forEach(plugin => value.use(plugin));
        }

        for(let value of this._values){
            await value.finalize(context);
        }
    }

    async finalizeEnumType(context: FinalizeContext, info: EnumTypeBuilderInfo) {}

    build(context: BuildContext): GraphQLEnumType {

        const info = this.info();

        this._executePluginsSync('beforeBuildEnumType', plugin => plugin.beforeBuildEnumType(this, context, info));

        let builtValues = {};

        for(let value of this._values){
            builtValues[value.name] = value.build(context);
        }

        const enumType = new GraphQLEnumType({
            name: this.name,
            description: this._description,
            values: builtValues,
            extensions: {
                ...Object.fromEntries(this._extensions)
            }
        });

        this._executePluginsSync('afterBuildEnumType', plugin => plugin.afterBuildEnumType(this, context, info, enumType));

        return enumType;
    }

    info(): EnumTypeBuilderInfo {

        return {
            name: this.name,
            description: this._description,
            values: clone(this._values),
            extensions: new Map(this._extensions),
            plugins: clone(this._plugins)
        }
    }
}

export function enumType(name: BuilderName, valuesObject: object = null): EnumTypeBuilder {

    return new EnumTypeBuilder(name, valuesObject);
}

export default enumType;