import { defaults } from "lodash";

import { FieldBuilder, FieldBuilderInfo } from "../../field";
import inputObject, { InputObjectTypeBuilder } from "../../inputObjectType";
import { ObjectTypeBuilder } from "../../objectType";
import { InputFieldType } from "../../inputField";
import { isTypeInput } from "../../util";
import { Plugin } from "../common";
import PluginError from "../PluginError";
import { BuildContext } from "../../Builder";

export interface EqualsFilterPluginOptions {
    multi?: boolean
    fields?: EqualsFilterPluginFieldConfig[]
    exclude?: string[]
    include?: EqualsFilterPluginFieldConfig[]
    argumentName?: string,
    inputName?: (typeName: string) => string
}

export interface EqualsFilterPluginFieldConfig {
    name: string
    type: InputFieldType
}

export const defaultEqualsFilterPluginOptions: EqualsFilterPluginOptions = {
    multi: false,
    argumentName: 'filter',
    inputName: typeName => `${typeName}EqualsFilter`,
}

export class EqualsFilterPlugin implements Plugin {

    protected _options: EqualsFilterPluginOptions;

    constructor(options?: EqualsFilterPluginOptions){

        this._options = defaults(options || {}, defaultEqualsFilterPluginOptions, {
            exclude: [],
            include: []
        });
    }

    multi(): this;
    multi(multi: boolean ): this;
    multi(multi: boolean = true): this {

        this._options.multi = multi;
        return this;
    }

    field(name: string, type: InputFieldType): this {

        if(!this._options.fields){
            this._options.fields = [];
        }

        this._options.fields.push({ name, type });
        return this;
    }

    exclude(...fieldNames: string[]): this {

        fieldNames.forEach(name => this._options.exclude.push(name));
        return this;
    }

    include(name: string, type: InputFieldType): this {

        this._options.include.push({ name, type });
        return this;
    }

    argumentName(name: string): this {

        this._options.argumentName = name;
        return this;
    }

    inputName(nameFactory: (typeName: string) => string): this {

        this._options.inputName = nameFactory;
        return this;
    }

    beforeBuildField(builder: FieldBuilder, context: BuildContext, info: FieldBuilderInfo) {

        if(!info.list){
            return;
        }

        const typeName = info.type.toString();
        const inputTypeName = this._options.inputName(typeName);

        let targetObjectType: ObjectTypeBuilder;

        if(!this._options.fields){

            targetObjectType = context.rootSchema.findType(typeName, true) as ObjectTypeBuilder;
            if(!targetObjectType){
                throw new PluginError(`Filter target object ${typeName} not found`);
            }

            if(!(targetObjectType instanceof ObjectTypeBuilder)){
                throw new PluginError(`Filter target ${typeName} is not an object type`);
            }
        }

        const inputType = this._createFilterInputType(context, inputTypeName, targetObjectType);
        context.schema.inputObject(inputType);

        builder.arg(this._options.argumentName, inputTypeName, _ => _.description(`Configuration for how the nodes should be filtered`));
    }

    protected _createFilterInputType(context: BuildContext, name: string, targetObjectType?: ObjectTypeBuilder): InputObjectTypeBuilder {

        const inputObjectType = inputObject(name)
            .description(`Configuration for how the nodes should be filtered`);

        let fields = new Set<EqualsFilterPluginFieldConfig>();

        if(targetObjectType){

            for(let field of targetObjectType.info().fields){

                const fieldInfo = field.info();
                if(!fieldInfo.list && isTypeInput(fieldInfo.type, context.rootSchema)){

                    fields.add({
                        name: field.name,
                        type: fieldInfo.type as InputFieldType
                    });
                }
            }
        }
        else if(this._options.fields){
            this._options.fields.forEach(field => fields.add(field));
        }

        if(this._options.include){
            this._options.include.forEach(field => fields.add(field));
        }

        const extraFields = this._getExtraFieldConfigs(context, name, targetObjectType);
        if(extraFields){
            extraFields.forEach(extraField => fields.add(extraField));
        }

        for(let field of fields){

            if(this._options.exclude && this._options.exclude.indexOf(field.name) >= 0){
                continue;
            }

            inputObjectType.field(field.name, field.type, _ => {

                if(this._options.multi){
                    _.list();
                }
            });
        }

        return inputObjectType;
    }

    protected _getExtraFieldConfigs(context: BuildContext, name: string, targetObjectType?: ObjectTypeBuilder): Set<EqualsFilterPluginFieldConfig> {
        return null;
    }
}

export function equalsFilterPlugin(options?: EqualsFilterPluginOptions): EqualsFilterPlugin {

    return new EqualsFilterPlugin(options);
}

export default equalsFilterPlugin;