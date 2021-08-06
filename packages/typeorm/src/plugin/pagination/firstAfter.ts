import { isNil, isArray, clone } from 'lodash'

import {
    ConstructorType,
    ensureInstantiated,
    FirstAfterPaginationPlugin as CoreFirstAfterPaginationPlugin,
    InvalidInputError,
    Optional,
    OptionalPromise
} from "@kiwano/core";

import { cursorToOffset, Plugin } from "../common";
import { AllResolverBaseHooks, AllResolverInfo, RelationResolverBaseHooks, RelationResolverInfo } from "../../resolver";

export interface IFirstAfterPaginationPluginHooks extends AllResolverBaseHooks<any, any>, RelationResolverBaseHooks<any, any> {}

export class FirstAfterPaginationPluginHooks implements IFirstAfterPaginationPluginHooks {

    $transformAllResult(result: any, originalResult: any[], info: AllResolverInfo<any>): OptionalPromise<Optional<any>> {

        const first = info.args.first;
        const after = info.args.after;

        if(result && isArray(result)){
            return this.applyFirstAfter(result, first, after, info);
        }
    }

    $transformRelationManyResult(relation: string, result: any, originalResult: any[], info: RelationResolverInfo<any>): OptionalPromise<Optional<any>> {

        const first = info.args.first;
        const after = info.args.after;

        if(result && isArray(result)){
            return this.applyFirstAfter(result, first, after, info);
        }
    }

    applyFirstAfter(items: any[], first: number, after: string, info: AllResolverInfo<any> | RelationResolverInfo<any>): any[] {

        const hasFirst = !isNil(first);
        const hasAfter = !isNil(after);

        if(!hasFirst && !hasAfter){
            return items;
        }

        let transformedItems = clone(items);

        this.beforeApplyFirstAfter(items, first, after, info);

        if(hasAfter){
            this.applyAfter(transformedItems, after, info);
        }

        if(hasFirst){
            this.applyFirst(transformedItems, first, info);
        }

        this.afterApplyFirstAfter(items, transformedItems, first, after, info);

        return transformedItems;
    }

    applyFirst(items: any[], first: number, info: AllResolverInfo<any> | RelationResolverInfo<any>) {

        if(first <= 0){
            throw new InvalidInputError("Invalid 'first' argument value provided");
        }

        items.splice(first);
    }

    applyAfter(items: any[], after: string, info: AllResolverInfo<any> | RelationResolverInfo<any>) {

        const offset = cursorToOffset(after);
        if(offset === null){
            throw new InvalidInputError("Invalid 'after' argument value provided");
        }

        items.splice(0, offset+1);
    }

    beforeApplyFirstAfter(items: any[], first: number, after: string, info: AllResolverInfo<any> | RelationResolverInfo<any>){}
    afterApplyFirstAfter(items: any[], transformedItems: any[], first: number, after: string, info: AllResolverInfo<any> | RelationResolverInfo<any>){}
}

export class FirstAfterPaginationPlugin extends CoreFirstAfterPaginationPlugin implements Plugin {

    protected _hooks: IFirstAfterPaginationPluginHooks | ConstructorType<IFirstAfterPaginationPluginHooks>;

    hooks(hooks: IFirstAfterPaginationPluginHooks | ConstructorType<IFirstAfterPaginationPluginHooks>): this {

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
            return new FirstAfterPaginationPluginHooks()
        }
    }
}

export function firstAfterPaginationPlugin(): FirstAfterPaginationPlugin {

    return new FirstAfterPaginationPlugin();
}

export default firstAfterPaginationPlugin;