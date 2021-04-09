import { SelectQueryBuilder } from "typeorm";

import isNil from 'lodash/isNil'

import {
    ConstructorType,
    ensureInstantiated,
    InvalidInputError,
    OffsetLimitPaginationPlugin as CoreOffsetLimitPaginationPlugin,
    OptionalPromise
} from "@kiwano/core"

import { Plugin } from "../common";
import { AllResolverBaseHooks, AllResolverInfo, RelationResolverBaseHooks, RelationResolverInfo } from "../../resolver";

export interface IOffsetLimitPaginationPluginHooks extends AllResolverBaseHooks<any, any>, RelationResolverBaseHooks<any, any> {}

export class OffsetLimitPaginationPluginHooks implements IOffsetLimitPaginationPluginHooks {

    $modifyAllQuery(builder: SelectQueryBuilder<any>, info: AllResolverInfo<any>): OptionalPromise {

        const offset = info.args.offset;
        const limit = info.args.limit;

        this.applyOffsetLimit(builder, offset, limit, info);
    }

    $modifyRelationManyQuery(relation: string, builder: SelectQueryBuilder<object>, info: RelationResolverInfo<any>): OptionalPromise {

        const offset = info.args.offset;
        const limit = info.args.limit;

        this.applyOffsetLimit(builder, offset, limit, info);
    }

    applyOffsetLimit(builder: SelectQueryBuilder<any>, offset: number, limit: number, info: AllResolverInfo<any> | RelationResolverInfo<any>) {

        const hasOffset = !isNil(offset);
        const hasLimit = !isNil(limit);

        if(!hasOffset && !hasLimit){
            return;
        }

        this.beforeApplyOffsetLimit(builder, offset, limit, info);

        if(hasOffset){
            this.applyOffset(builder, offset, info);
        }

        if(hasLimit){
            this.applyLimit(builder, limit, info);
        }

        this.afterApplyOffsetLimit(builder, offset, limit, info);
    }

    applyOffset(builder: SelectQueryBuilder<any>, offset: number, info: AllResolverInfo<any> | RelationResolverInfo<any>){

        if(offset < 0){
            throw new InvalidInputError("Invalid 'offset' argument value provided");
        }

        builder.offset(offset);
    }

    applyLimit(builder: SelectQueryBuilder<any>, limit: number, info: AllResolverInfo<any> | RelationResolverInfo<any>){

        if(limit <= 0){
            throw new InvalidInputError("Invalid 'limit' argument value provided");
        }

        builder.limit(limit);
    }

    beforeApplyOffsetLimit(builder: SelectQueryBuilder<any>, offset: number, limit: number, info: AllResolverInfo<any> | RelationResolverInfo<any>){}
    afterApplyOffsetLimit(builder: SelectQueryBuilder<any>, offset: number, limit: number, info: AllResolverInfo<any> | RelationResolverInfo<any>){}
}

export class OffsetLimitPaginationPlugin extends CoreOffsetLimitPaginationPlugin implements Plugin {

    protected _hooks: IOffsetLimitPaginationPluginHooks | ConstructorType<IOffsetLimitPaginationPluginHooks>;

    hooks(hooks: IOffsetLimitPaginationPluginHooks | ConstructorType<IOffsetLimitPaginationPluginHooks>): this {

        this._hooks = hooks;
        return this;
    }

    getAllResolverHooks(): AllResolverBaseHooks<any, any>[] {

        return [this._resolvedHooks];
    }

    getRelationResolverHooks(): RelationResolverBaseHooks<any, any, any>[] {

        return [this._resolvedHooks];
    }

    protected get _resolvedHooks(){

        if(this._hooks){
            return ensureInstantiated(this._hooks);
        }
        else {
            return new OffsetLimitPaginationPluginHooks()
        }
    }
}

export function offsetLimitPaginationPlugin(): OffsetLimitPaginationPlugin {

    return new OffsetLimitPaginationPlugin();
}

export default offsetLimitPaginationPlugin;