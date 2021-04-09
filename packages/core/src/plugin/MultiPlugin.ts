import { GraphQLFieldConfig, GraphQLInputObjectType, GraphQLObjectType, GraphQLSchema } from "graphql";
import {
    GraphQLArgumentConfig,
    GraphQLEnumType,
    GraphQLEnumValueConfig,
    GraphQLInputFieldConfig,
    GraphQLUnionType
} from "graphql/type/definition";

import { SchemaBuilder } from "../schema";
import { FieldBuilder, FieldBuilderInfo } from "../field";
import { ObjectTypeBuilder, ObjectTypeBuilderInfo } from "../objectType";
import { InputObjectTypeBuilder, InputObjectTypeBuilderInfo } from "../inputObjectType";
import { InputFieldBuilder, InputFieldBuilderInfo } from "../inputField";
import { ArgumentBuilder, ArgumentBuilderInfo } from "../argument";
import { EnumTypeBuilder, EnumTypeBuilderInfo } from "../enumType";
import { EnumValueBuilder, EnumValueBuilderInfo } from "../enumValue";
import { UnionTypeBuilder, UnionTypeBuilderInfo } from "../unionType";
import { Plugin } from "./common";
import { OptionalPromise } from "../common";
import { BuildContext, FinalizeContext } from "../Builder";

export class MultiPlugin implements Plugin {

    protected _plugins: Plugin[];

    constructor(plugins: Plugin[] = null) {

        this._plugins = plugins || this.getPlugins();
    }

    protected getPlugins(): Plugin[] {
        return [];
    }

    async execute(methodName: string, fn: (plugin: Plugin) => OptionalPromise){

        let results = [];

        for(let plugin of this._plugins){

            if(plugin[methodName]){

                const result = await fn(plugin);
                results.push(result);
            }
        }

        return results;
    }

    executeSync(methodName: string, fn: (plugin: Plugin) => void){

        let results = [];

        for(let plugin of this._plugins){

            if(plugin[methodName]){

                const result = fn(plugin);
                results.push(result);
            }
        }

        return results;
    }


    async beforeFinalizeSchema(builder: SchemaBuilder) {
        await this.execute('beforeFinalizeSchema', plugin => plugin.beforeFinalizeSchema(builder));
    }

    async afterFinalizeSchema(builder: SchemaBuilder) {
        await this.execute('afterFinalizeSchema', plugin => plugin.afterFinalizeSchema(builder));
    }

    async beforeFinalizeObjectType(builder: ObjectTypeBuilder, context: FinalizeContext, info: ObjectTypeBuilderInfo) {
        await this.execute('beforeFinalizeObjectType', plugin => plugin.beforeFinalizeObjectType(builder, context, info));
    }

    async afterFinalizeObjectType(builder: ObjectTypeBuilder, context: FinalizeContext, info: ObjectTypeBuilderInfo) {
        await this.execute('afterFinalizeObjectType', plugin => plugin.afterFinalizeObjectType(builder, context, info));
    }

    async beforeFinalizeInputObjectType(builder: InputObjectTypeBuilder, context: FinalizeContext, info: InputObjectTypeBuilderInfo) {
        await this.execute('beforeFinalizeInputObjectType', plugin => plugin.beforeFinalizeInputObjectType(builder, context, info));
    }

    async afterFinalizeInputObjectType(builder: InputObjectTypeBuilder, context: FinalizeContext, info: InputObjectTypeBuilderInfo) {
        await this.execute('afterFinalizeInputObjectType', plugin => plugin.afterFinalizeInputObjectType(builder, context, info));
    }

    async beforeFinalizeEnumType(builder: EnumTypeBuilder, context: FinalizeContext, info: EnumTypeBuilderInfo) {
        await this.execute('beforeFinalizeEnumType', plugin => plugin.beforeFinalizeEnumType(builder, context, info));
    }

    async afterFinalizeEnumType(builder: EnumTypeBuilder, context: FinalizeContext, info: EnumTypeBuilderInfo) {
        await this.execute('afterFinalizeEnumType', plugin => plugin.afterFinalizeEnumType(builder, context, info));
    }

    async beforeFinalizeEnumValue(builder: EnumValueBuilder, context: FinalizeContext, info: EnumValueBuilderInfo) {
        await this.execute('beforeFinalizeEnumValue', plugin => plugin.beforeFinalizeEnumValue(builder, context, info));
    }

    async afterFinalizeEnumValue(builder: EnumValueBuilder, context: FinalizeContext, info: EnumValueBuilderInfo) {
        await this.execute('afterFinalizeEnumValue', plugin => plugin.afterFinalizeEnumValue(builder, context, info));
    }

    async beforeFinalizeUnionType(builder: UnionTypeBuilder, context: FinalizeContext, info: UnionTypeBuilderInfo) {
        await this.execute('beforeFinalizeUnionType', plugin => plugin.beforeFinalizeUnionType(builder, context, info));
    }

    async afterFinalizeUnionType(builder: UnionTypeBuilder, context: FinalizeContext, info: UnionTypeBuilderInfo) {
        await this.execute('afterFinalizeUnionType', plugin => plugin.afterFinalizeUnionType(builder, context, info));
    }

    async beforeFinalizeField(builder: FieldBuilder, context: FinalizeContext, info: FieldBuilderInfo) {
        await this.execute('beforeFinalizeField', plugin => plugin.beforeFinalizeField(builder, context, info));
    }

    async afterFinalizeField(builder: FieldBuilder, context: FinalizeContext, info: FieldBuilderInfo) {
        await this.execute('afterFinalizeField', plugin => plugin.afterFinalizeField(builder, context, info));
    }

    async beforeFinalizeInputField(builder: InputFieldBuilder, context: FinalizeContext, info: InputFieldBuilderInfo) {
        await this.execute('beforeFinalizeInputField', plugin => plugin.beforeFinalizeInputField(builder, context, info));
    }

    async afterFinalizeInputField(builder: InputFieldBuilder, context: FinalizeContext, info: InputFieldBuilderInfo) {
        await this.execute('afterFinalizeInputField', plugin => plugin.afterFinalizeInputField(builder, context, info));
    }

    async beforeFinalizeArgument(builder: ArgumentBuilder, context: FinalizeContext, info: ArgumentBuilderInfo) {
        await this.execute('beforeFinalizeArgument', plugin => plugin.beforeFinalizeArgument(builder, context, info));
    }

    async afterFinalizeArgument(builder: ArgumentBuilder, context: FinalizeContext, info: ArgumentBuilderInfo) {
        await this.execute('afterFinalizeArgument', plugin => plugin.afterFinalizeArgument(builder, context, info));
    }


    beforeBuild(rootBuilder: SchemaBuilder) {
        this.executeSync('beforeBuild', plugin => plugin.beforeBuild(rootBuilder));
    }

    afterBuild(rootBuilder: SchemaBuilder, schema: GraphQLSchema) {
        this.executeSync('afterBuild', plugin => plugin.afterBuild(rootBuilder, schema));
    }

    beforeBuildSchema(builder: SchemaBuilder) {
        this.executeSync('beforeBuildSchema', plugin => plugin.beforeBuildSchema(builder));
    }

    afterBuildSchema(builder: SchemaBuilder, schema: GraphQLSchema) {
        this.executeSync('afterBuildSchema', plugin => plugin.afterBuildSchema(builder, schema));
    }

    beforeBuildObjectType(builder: ObjectTypeBuilder, context: BuildContext) {
        this.executeSync('beforeBuildObjectType', plugin => plugin.beforeBuildObjectType(builder, context));
    }

    afterBuildObjectType(builder: ObjectTypeBuilder, context: BuildContext, objectType: GraphQLObjectType) {
        this.executeSync('afterBuildObjectType', plugin => plugin.afterBuildObjectType(builder, context, objectType));
    }

    beforeBuildInputObjectType(builder: InputObjectTypeBuilder, context: BuildContext) {
        this.executeSync('beforeBuildInputObjectType', plugin => plugin.beforeBuildInputObjectType(builder, context));
    }

    afterBuildInputObjectType(builder: InputObjectTypeBuilder, context: BuildContext, inputObjectType: GraphQLInputObjectType) {
        this.executeSync('afterBuildInputObjectType', plugin => plugin.afterBuildInputObjectType(builder, context, inputObjectType));
    }

    beforeBuildEnumType(builder: EnumTypeBuilder, context: BuildContext) {
        this.executeSync('beforeBuildEnumType', plugin => plugin.beforeBuildEnumType(builder, context));
    }

    afterBuildEnumType(builder: EnumTypeBuilder, context: BuildContext, enumType: GraphQLEnumType) {
        this.executeSync('afterBuildEnumType', plugin => plugin.afterBuildEnumType(builder, context, enumType));
    }

    beforeBuildEnumValue(builder: EnumValueBuilder, context: BuildContext) {
        this.executeSync('beforeBuildEnumValue', plugin => plugin.beforeBuildEnumValue(builder, context));
    }

    afterBuildEnumValue(builder: EnumValueBuilder, context: BuildContext, enumValue: GraphQLEnumValueConfig) {
        this.executeSync('afterBuildEnumValue', plugin => plugin.afterBuildEnumValue(builder, context, enumValue));
    }

    beforeBuildUnionType(builder: UnionTypeBuilder, context: BuildContext) {
        this.executeSync('beforeBuildUnionType', plugin => plugin.beforeBuildUnionType(builder, context));
    }

    afterBuildUnionType(builder: UnionTypeBuilder, context: BuildContext, unionType: GraphQLUnionType) {
        this.executeSync('afterBuildUnionType', plugin => plugin.afterBuildUnionType(builder, context, unionType));
    }

    beforeBuildField(builder: FieldBuilder, context: BuildContext) {
        this.executeSync('beforeBuildField', plugin => plugin.beforeBuildField(builder, context));
    }

    afterBuildField(builder: FieldBuilder, context: BuildContext, field: GraphQLFieldConfig<any, any>) {
        this.executeSync('afterBuildField', plugin => plugin.afterBuildField(builder, context, field));
    }

    beforeBuildInputField(builder: InputFieldBuilder, context: BuildContext) {
        this.executeSync('beforeBuildInputField', plugin => plugin.beforeBuildInputField(builder, context));
    }

    afterBuildInputField(builder: InputFieldBuilder, context: BuildContext, inputField: GraphQLInputFieldConfig) {
        this.executeSync('afterBuildInputField', plugin => plugin.afterBuildInputField(builder, context, inputField));
    }

    beforeBuildArgument(builder: ArgumentBuilder, context: BuildContext) {
        this.executeSync('beforeBuildArgument', plugin => plugin.beforeBuildArgument(builder, context));
    }

    afterBuildArgument(builder: ArgumentBuilder, context: BuildContext, argument: GraphQLArgumentConfig) {
        this.executeSync('afterBuildArgument', plugin => plugin.afterBuildArgument(builder, context, argument));
    }
}

export default MultiPlugin;