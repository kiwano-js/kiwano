import { GraphQLEnumValueConfig } from "graphql/type/definition";
import { clone } from "lodash";

import Builder, { BuildContext, FinalizeContext, builderInfoExtensionName, BuilderName } from "./Builder";
import { Plugin } from "./plugin";

export interface EnumValueBuilderInfo {
    name: string
    value?: any
    description?: string
    extensions: Map<string, any>
    plugins: Plugin[]
}

export class EnumValueBuilder extends Builder<GraphQLEnumValueConfig> {

    protected _value?: any;
    protected _description?: string;
    protected _extensions = new Map<string, any>();

    constructor(name: BuilderName, value: string = null) {

        super(name);
        this._value = value;
    }

    value(value: any): this {

        this._value = value;
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

    async finalizeBuilder(context: FinalizeContext){

        const info = this.info();

        await this._executePlugins('beforeFinalizeEnumValue', plugin => plugin.beforeFinalizeEnumValue(this, context, info));

        await this.finalizeEnumValue(context, info);

        await this._executePlugins('afterFinalizeEnumValue', plugin => plugin.afterFinalizeEnumValue(this, context, info));
    }

    async finalizeEnumValue(context: FinalizeContext, info: EnumValueBuilderInfo){}

    build(context: BuildContext): GraphQLEnumValueConfig {

        this._executePluginsSync('beforeBuildEnumValue', plugin => plugin.beforeBuildEnumValue(this, context));

        const enumValue = {
            value: this._value,
            description: this._description,
            extensions: {
                [builderInfoExtensionName]: this.info(),
                ...Object.fromEntries(this._extensions)
            }
        };

        this._executePluginsSync('afterBuildEnumValue', plugin => plugin.afterBuildEnumValue(this, context, enumValue));

        return enumValue;
    }

    info(): EnumValueBuilderInfo {

        return {
            name: this.name,
            value: this._value,
            description: this._description,
            extensions: new Map(this._extensions),
            plugins: clone(this._plugins)
        }
    }
}

export function enumValue(name: BuilderName, value: any = null): EnumValueBuilder {

    return new EnumValueBuilder(name, value);
}

export default enumValue;