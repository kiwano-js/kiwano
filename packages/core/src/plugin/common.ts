import { GraphQLFieldConfig, GraphQLInputObjectType, GraphQLObjectType, GraphQLSchema } from "graphql";
import {
    GraphQLArgumentConfig,
    GraphQLEnumType,
    GraphQLEnumValueConfig,
    GraphQLInputFieldConfig,
    GraphQLUnionType
} from "graphql/type/definition";

import { AbstractSchemaBuilder } from "../schema";
import { FieldBuilder, FieldBuilderInfo } from "../field";
import { ObjectTypeBuilder, ObjectTypeBuilderInfo } from "../objectType";
import { InputObjectTypeBuilder, InputObjectTypeBuilderInfo } from "../inputObjectType";
import { InputFieldBuilder, InputFieldBuilderInfo } from "../inputField";
import { ArgumentBuilder, ArgumentBuilderInfo } from "../argument";
import { EnumTypeBuilder, EnumTypeBuilderInfo } from "../enumType";
import { EnumValueBuilder, EnumValueBuilderInfo } from "../enumValue";
import { UnionTypeBuilder, UnionTypeBuilderInfo } from "../unionType";
import { OptionalPromise } from "../common";
import { BuildContext, FinalizeContext } from "../Builder";

export interface Plugin {

    // Finalize
    beforeFinalizeSchema?(builder: AbstractSchemaBuilder<any>): OptionalPromise;
    afterFinalizeSchema?(builder: AbstractSchemaBuilder<any>): OptionalPromise;

    beforeFinalizeObjectType?(builder: ObjectTypeBuilder, context: FinalizeContext, info: ObjectTypeBuilderInfo): OptionalPromise;
    afterFinalizeObjectType?(builder: ObjectTypeBuilder, context: FinalizeContext, info: ObjectTypeBuilderInfo): OptionalPromise;

    beforeFinalizeInputObjectType?(builder: InputObjectTypeBuilder, context: FinalizeContext, info: InputObjectTypeBuilderInfo): OptionalPromise;
    afterFinalizeInputObjectType?(builder: InputObjectTypeBuilder, context: FinalizeContext, info: InputObjectTypeBuilderInfo): OptionalPromise;

    beforeFinalizeEnumType?(builder: EnumTypeBuilder, context: FinalizeContext, info: EnumTypeBuilderInfo): OptionalPromise;
    afterFinalizeEnumType?(builder: EnumTypeBuilder, context: FinalizeContext, info: EnumTypeBuilderInfo): OptionalPromise;

    beforeFinalizeEnumValue?(builder: EnumValueBuilder, context: FinalizeContext, info: EnumValueBuilderInfo): OptionalPromise;
    afterFinalizeEnumValue?(builder: EnumValueBuilder, context: FinalizeContext, info: EnumValueBuilderInfo): OptionalPromise;

    beforeFinalizeUnionType?(builder: UnionTypeBuilder, context: FinalizeContext, info: UnionTypeBuilderInfo): OptionalPromise;
    afterFinalizeUnionType?(builder: UnionTypeBuilder, context: FinalizeContext, info: UnionTypeBuilderInfo): OptionalPromise;

    beforeFinalizeField?(builder: FieldBuilder, context: FinalizeContext, info: FieldBuilderInfo): OptionalPromise;
    afterFinalizeField?(builder: FieldBuilder, context: FinalizeContext, info: FieldBuilderInfo): OptionalPromise;

    beforeFinalizeInputField?(builder: InputFieldBuilder, context: FinalizeContext, info: InputFieldBuilderInfo): OptionalPromise;
    afterFinalizeInputField?(builder: InputFieldBuilder, context: FinalizeContext, info: InputFieldBuilderInfo): OptionalPromise;

    beforeFinalizeArgument?(builder: ArgumentBuilder, context: FinalizeContext, info: ArgumentBuilderInfo): OptionalPromise;
    afterFinalizeArgument?(builder: ArgumentBuilder, context: FinalizeContext, info: ArgumentBuilderInfo): OptionalPromise;

    // Build
    beforeBuild?(rootBuilder: AbstractSchemaBuilder<any>);
    afterBuild?(rootBuilder: AbstractSchemaBuilder<any>, schema: GraphQLSchema);

    beforeBuildSchema?(builder: AbstractSchemaBuilder<any>);
    afterBuildSchema?(builder: AbstractSchemaBuilder<any>, schema: GraphQLSchema);

    beforeBuildObjectType?(builder: ObjectTypeBuilder, context: BuildContext, info: ObjectTypeBuilderInfo);
    afterBuildObjectType?(builder: ObjectTypeBuilder, context: BuildContext, info: ObjectTypeBuilderInfo, objectType: GraphQLObjectType);

    beforeBuildInputObjectType?(builder: InputObjectTypeBuilder, context: BuildContext, info: InputObjectTypeBuilderInfo);
    afterBuildInputObjectType?(builder: InputObjectTypeBuilder, context: BuildContext, info: InputObjectTypeBuilderInfo, inputObjectType: GraphQLInputObjectType);

    beforeBuildEnumType?(builder: EnumTypeBuilder, context: BuildContext, info: EnumTypeBuilderInfo);
    afterBuildEnumType?(builder: EnumTypeBuilder, context: BuildContext, info: EnumTypeBuilderInfo, enumType: GraphQLEnumType);

    beforeBuildEnumValue?(builder: EnumValueBuilder, context: BuildContext, info: EnumValueBuilderInfo);
    afterBuildEnumValue?(builder: EnumValueBuilder, context: BuildContext, info: EnumValueBuilderInfo, enumValue: GraphQLEnumValueConfig);

    beforeBuildUnionType?(builder: UnionTypeBuilder, context: BuildContext, info: UnionTypeBuilderInfo);
    afterBuildUnionType?(builder: UnionTypeBuilder, context: BuildContext, info: UnionTypeBuilderInfo, unionType: GraphQLUnionType);

    beforeBuildField?(builder: FieldBuilder, context: BuildContext, info: FieldBuilderInfo);
    afterBuildField?(builder: FieldBuilder, context: BuildContext, info: FieldBuilderInfo, field: GraphQLFieldConfig<any, any>);

    beforeBuildInputField?(builder: InputFieldBuilder, context: BuildContext, info: InputFieldBuilderInfo);
    afterBuildInputField?(builder: InputFieldBuilder, context: BuildContext, info: InputFieldBuilderInfo, inputField: GraphQLInputFieldConfig);

    beforeBuildArgument?(builder: ArgumentBuilder, context: BuildContext, info: ArgumentBuilderInfo);
    afterBuildArgument?(builder: ArgumentBuilder, context: BuildContext, info: ArgumentBuilderInfo, argument: GraphQLArgumentConfig);
}