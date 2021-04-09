import compact from 'lodash/compact'
import flatten from 'lodash/flatten'
import isNaN from 'lodash/isNaN'

import { SelectQueryBuilder } from "typeorm";
import { RelationMetadata } from "typeorm/metadata/RelationMetadata";

import { MultiPlugin as CoreMultiPlugin, Plugin as CorePlugin } from "@kiwano/core";

import {
    AllResolverBaseHooks,
    CreateResolverBaseHooks,
    DeleteResolverBaseHooks,
    FindResolverBaseHooks,
    RelationResolverBaseHooks,
    UpdateResolverBaseHooks
} from "../resolver";

export interface Plugin extends CorePlugin {

    getFindResolverHooks?(): FindResolverBaseHooks<any, any>[]
    getAllResolverHooks?(): AllResolverBaseHooks<any, any>[]

    getRelationResolverHooks?(): RelationResolverBaseHooks<any, any, any>[]

    getCreateResolverHooks?(): CreateResolverBaseHooks<any, any>[]
    getUpdateResolverHooks?(): UpdateResolverBaseHooks<any, any>[]
    getDeleteResolverHooks?(): DeleteResolverBaseHooks<any, any>[]
}

export class MultiPlugin extends CoreMultiPlugin implements Plugin {

    getFindResolverHooks(): FindResolverBaseHooks<any, any>[] {
        return this.collectResolverHooks('getFindResolverHooks');
    }

    getAllResolverHooks(): AllResolverBaseHooks<any, any>[] {
        return this.collectResolverHooks('getAllResolverHooks');
    }

    getRelationResolverHooks(): RelationResolverBaseHooks<any, any>[] {
        return this.collectResolverHooks('getRelationResolverHooks');
    }

    getCreateResolverHooks(): CreateResolverBaseHooks<any, any>[] {
        return this.collectResolverHooks('getCreateResolverHooks');
    }

    getUpdateResolverHooks(): UpdateResolverBaseHooks<any, any>[] {
        return this.collectResolverHooks('getUpdateResolverHooks');
    }

    getDeleteResolverHooks(): DeleteResolverBaseHooks<any, any>[] {
        return this.collectResolverHooks('getDeleteResolverHooks');
    }

    collectResolverHooks(methodName: string){
        return flatten(compact(this.executeSync(methodName, (plugin: Plugin) => plugin[methodName]())));
    }
}

export const cursorPrefix = "CURSOR:";

export function offsetToCursor(offset: number): string {

    const buff = Buffer.from(`${cursorPrefix}${offset}`);
    return buff.toString('base64');
}

export function cursorToOffset(cursor: string): number {

    const buff = Buffer.from(cursor, 'base64');
    const decoded = buff.toString('ascii');
    if(!decoded){
        return null;
    }

    const offset = parseInt(decoded.replace(cursorPrefix, ''));
    if(offset < 0 || isNaN(offset)){
        return null;
    }

    return offset;
}

export function addRelationJoin(builder: SelectQueryBuilder<any>, relationMeta: RelationMetadata, mainAlias: string, joinAlias: string){

    const joinColumns = relationMeta.isOwning ? relationMeta.joinColumns : relationMeta.inverseRelation!.joinColumns;

    const conditions = joinColumns.map(joinColumn => {
        return `${mainAlias}.${joinColumn.propertyName} = ${joinAlias}.${joinColumn.referencedColumn!.propertyName}`;
    }).join(" AND ");

    builder.leftJoin(relationMeta.type as Function, joinAlias, conditions);
}