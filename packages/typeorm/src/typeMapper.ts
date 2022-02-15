import { isString } from 'lodash'

import { ColumnType } from "typeorm";
import { JSONResolver, UUIDResolver, ByteResolver, DateTimeResolver, DateResolver, LocalTimeResolver } from "graphql-scalars";

import { ColumnTypeMapperInfo, ColumnTypeMapperResult } from "./common";

export type TypeIdentifier = ColumnType | string;

export const stringTypes: TypeIdentifier[] = [String, 'character varying', 'varying character', 'char varying', 'nvarchar', 'national varchar', 'character', 'native character', 'varchar', 'char', 'nchar', 'national char', 'varchar2', 'nvarchar2', 'alphanum', 'shorttext', 'raw', 'string', 'tinytext', 'text', 'ntext', 'citext', 'longtext', 'simple-array'];
export const intTypes: TypeIdentifier[] = [Number, 'int', 'int2', 'int4', 'int8', 'int64', 'integer', 'tinyint', 'smallint', 'mediumint', 'bigint', 'numeric', 'number', 'unsigned big int', 'long', 'interval'];
export const floatTypes: TypeIdentifier[] = ['dec', 'decimal', 'smalldecimal', 'fixed', 'float', 'float4', 'float8', 'double', 'double precision', 'real'];
export const booleanTypes: TypeIdentifier[] = [Boolean, 'boolean', 'bool', 'bit']
export const idTypes: TypeIdentifier[] = ['rowid', 'urowid', 'uniqueidentifier'];
export const enumTypes: TypeIdentifier[] = ['enum', 'set'];
export const jsonTypes: TypeIdentifier[] = ['simple-json', 'json', 'jsonb'];
export const byteTypes: TypeIdentifier[] = ['raw', 'binary', 'varbinary', 'tinyblob', 'mediumblob', 'blob', 'longblob', 'bytes', 'long raw', 'bfile', 'clob', 'nclob', 'image'];
export const dateTimeTypes: TypeIdentifier[] = [Date, 'datetime', 'datetime2', 'smalldatetime', 'timestamp', 'timestamptz', 'timestamp without time zone', 'timestamp with time zone', 'timestamp with local time zone'];
export const timeTypes: TypeIdentifier[] = ['time', 'time with time zone', 'time without time zone'];

export const listTypes: TypeIdentifier[] = ['set', 'simple-array', ...byteTypes];

export function typeMapper(info: ColumnTypeMapperInfo): ColumnTypeMapperResult {

    const metadata = info.columnMetadata;
    const metadataType = metadata.type;
    const tableType = info.tableColumn?.type;

    let type: TypeIdentifier = isString(metadataType) ? metadataType : tableType;

    // Always adopt when type is boolean; database type mostly differs
    if(metadataType === Boolean){
        type = Boolean;
    }

    const result: ColumnTypeMapperResult = {
        type: 'String',
        list: listTypes.indexOf(type) >= 0
    }

    if(metadata.isPrimary || idTypes.indexOf(type) >= 0 || info.isJoinColumn){
        result.type = 'ID';
    }
    else if(enumTypes.indexOf(type) >= 0 && metadata.enumName){
        result.type = metadata.enumName;
    }
    else if(booleanTypes.indexOf(type) >= 0){
        result.type = 'Boolean'
    }
    else if(floatTypes.indexOf(type) >= 0){
        result.type = 'Float'
    }
    else if(intTypes.indexOf(type) >= 0){
        result.type = 'Int'
    }
    else if(jsonTypes.indexOf(type) >= 0){
        result.type = JSONResolver;
    }
    else if(stringTypes.indexOf(type) >= 0){
        result.type = 'String'
    }
    else if(byteTypes.indexOf(type) >= 0){
        result.type = ByteResolver;
    }
    else if(dateTimeTypes.indexOf(type) >= 0){
        result.type = DateTimeResolver;
    }
    else if(timeTypes.indexOf(type) >= 0){
        result.type = LocalTimeResolver;
    }
    else if(type === 'date'){
        result.type = DateResolver;
    }
    else if(type === 'uuid'){
        result.type = UUIDResolver
    }

    return result;
}

export default typeMapper;