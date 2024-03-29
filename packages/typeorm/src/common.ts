import { DataSource } from "typeorm";
import { EntityTarget } from "typeorm/common/EntityTarget";
import { ColumnMetadata } from "typeorm/metadata/ColumnMetadata";
import { RelationMetadata } from "typeorm/metadata/RelationMetadata";
import { TableColumn } from "typeorm/schema-builder/table/TableColumn";

import { GraphQLOutputType } from "graphql";

export type ColumnTypeMapperType = string | GraphQLOutputType;

export interface ColumnTypeMapperResult {
    type: ColumnTypeMapperType
    list: boolean
}

export interface ColumnTypeMapperInfo {
    columnMetadata: ColumnMetadata
    tableColumn?: TableColumn
    isJoinColumn: boolean
}

export type ColumnTypeMapper = (ColumnTypeMapperInfo) => ColumnTypeMapperResult;
export type ModelType = EntityTarget<any>;

export interface ModelBuilderOptions<NT> {
    dataSource: DataSource
    name?: NT
    typeMapper?: ColumnTypeMapper
}

export function relationIsMany(relation: RelationMetadata): boolean {

    return relation.isOneToMany || relation.isManyToMany;
}