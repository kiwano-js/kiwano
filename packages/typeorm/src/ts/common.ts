import type { DataSource, EntityTarget, TableColumn } from "typeorm";
import type { RelationMetadata } from "typeorm/metadata/RelationMetadata.js";
import type { ColumnMetadata } from "typeorm/metadata/ColumnMetadata.js";

import type { GraphQLOutputType } from "graphql";

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
