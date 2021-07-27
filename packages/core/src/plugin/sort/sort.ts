import { defaults } from "lodash";

import { FieldBuilder } from "../../field";
import inputObject, { InputObjectTypeBuilder } from "../../inputObjectType";
import enumType, { EnumTypeBuilder } from "../../enumType";
import { ObjectTypeBuilder } from "../../objectType";
import { isTypeInput } from "../../util";
import { Plugin } from "../common";
import PluginError from "../PluginError";
import { BuildContext } from "../../Builder";

export enum SortDirection {
    ASC = 'ASC', DESC = 'DESC'
}

export interface SortPluginOptions {
    multi?: boolean
    fields?: string[]
    exclude?: string[]
    include?: string[]
    directionEnumName?: string
    argumentName?: string,
    inputName?: (typeName: string) => string
    fieldEnumName?: (typeName: string) => string
}

export interface SortConfiguration<FieldEnumType> {
    field: FieldEnumType
    direction: SortDirection
}

export const defaultSortPluginOptions: SortPluginOptions = {
    multi: false,
    directionEnumName: 'SortDirection',
    argumentName: 'sort',
    inputName: typeName => `${typeName}SortConfiguration`,
    fieldEnumName: typeName => `${typeName}SortField`
}

export class SortPlugin implements Plugin {

    protected _options: SortPluginOptions;

    constructor(options?: SortPluginOptions){

        this._options = defaults(options || {}, defaultSortPluginOptions, {
            exclude: [],
            include: []
        });
    }

    multi(multi: boolean = true): this {

        this._options.multi = multi;
        return this;
    }

    field(...fieldNames: string[]): this {

        if(!this._options.fields){
            this._options.fields = [];
        }

        fieldNames.forEach(name => this._options.fields.push(name));
        return this;
    }

    exclude(...fieldNames: string[]): this {

        fieldNames.forEach(name => this._options.exclude.push(name));
        return this;
    }

    include(...fieldNames: string[]): this {

        fieldNames.forEach(name => this._options.include.push(name));
        return this;
    }

    directionEnumName(name: string): this {

        this._options.directionEnumName = name;
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

    fieldEnumName(nameFactory: (typeName: string) => string): this {

        this._options.fieldEnumName = nameFactory;
        return this;
    }

    beforeBuildField(builder: FieldBuilder, context: BuildContext) {

        const info = builder.info();
        if(!info.list){
            return;
        }

        if(!context.schema.hasType(this._options.directionEnumName)){
            context.schema.enum(this._createSortDirectionEnum());
        }

        const typeName = info.type.toString();
        const inputTypeName = this._options.inputName(typeName);
        const fieldEnumName = this._options.fieldEnumName(typeName);

        let targetObjectType: ObjectTypeBuilder;

        if(!this._options.fields){

            targetObjectType = context.rootSchema.findType(typeName, true) as ObjectTypeBuilder;
            if(!targetObjectType){
                throw new PluginError(`Sort target object "${typeName}" not found`);
            }

            if(!(targetObjectType instanceof ObjectTypeBuilder)){
                throw new PluginError(`Sort target "${typeName}" is not an object type`);
            }
        }

        const enumType = this._createSortFieldEnum(context, fieldEnumName, typeName, targetObjectType);
        context.schema.enum(enumType);

        const inputType = this._createSortInputType(inputTypeName, fieldEnumName);
        context.schema.inputObject(inputType);

        builder.arg(this._options.argumentName, inputTypeName, _ => {

            if(this._options.multi){
                _.list().description('Collection of sort configurations')
            }
            else {
                _.description('Sort configuration')
            }
        });
    }

    protected _createSortInputType(name: string, enumName: string): InputObjectTypeBuilder {

        return inputObject(name)
            .description(`Configuration for how the nodes should be sorted`)
            .field('field', enumName, _ => _.nonNull().description('Field to sort on'))
            .field('direction', this._options.directionEnumName, _ => _.nonNull().description('Direction to sort'));
    }

    protected _createSortFieldEnum(context: BuildContext, name: string, typeName: string, targetObjectType?: ObjectTypeBuilder): EnumTypeBuilder {

        const enumBuilder = enumType(name)
            .description(`Field to sort ${typeName} on`);

        let fields = new Set<string>();

        if(targetObjectType){

            for(let field of targetObjectType.info().fields){

                const fieldInfo = field.info();
                if(!fieldInfo.list && isTypeInput(fieldInfo.type, context.rootSchema)){
                    fields.add(field.name);
                }
            }
        }
        else if(this._options.fields){
            this._options.fields.forEach(field => fields.add(field));
        }

        if(this._options.include){
            this._options.include.forEach(field => fields.add(field));
        }

        const extraValues = this._getExtraEnumValues(context, name, typeName, targetObjectType);
        if(extraValues){
            extraValues.forEach(extraField => fields.add(extraField));
        }

        for(let field of fields){

            if(this._options.exclude && this._options.exclude.indexOf(field) >= 0){
                continue;
            }

            enumBuilder.value(field, field);
        }

        return enumBuilder;
    }

    protected _createSortDirectionEnum(): EnumTypeBuilder {

        return enumType(this._options.directionEnumName)
            .description('Direction to sort')
            .value(SortDirection.ASC, SortDirection.ASC, _ => _.description('Sort ascending'))
            .value(SortDirection.DESC, SortDirection.DESC, _ => _.description('Sort descending'))
    }

    protected _getExtraEnumValues(context: BuildContext, name: string, typeName: string, targetObjectType?: ObjectTypeBuilder): Set<string> {
        return null;
    }
}

export function sortPlugin(options?: SortPluginOptions): SortPlugin {

    return new SortPlugin(options);
}

export default sortPlugin;