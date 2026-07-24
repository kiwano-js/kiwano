import { isArray } from 'es-toolkit/compat'

import {
    type ConstructorType,
    ensureInstantiated,
    ItemsPaginationPlugin as CoreItemsPaginationPlugin,
    type Optional,
    type OptionalPromise
} from "@kiwano/core"

import type { Plugin } from "../common";
import type { AllResolverBaseHooks, AllResolverInfo, RelationResolverBaseHooks, RelationResolverInfo } from "../../resolver";
import { getSelectedFieldNames } from "../../resolver/selection";

export interface IItemsPaginationPluginHooks extends AllResolverBaseHooks<any, any>, RelationResolverBaseHooks<any, any> {}

export class ItemsPaginationPluginHooks implements IItemsPaginationPluginHooks {

    $shouldFetchAll(info: AllResolverInfo<any>): OptionalPromise<boolean> {

        const selectedFields = getSelectedFieldNames(info.info);
        if(selectedFields.has('items')){
            return true;
        }

        return Array.from(selectedFields).some(fieldName => !['totalCount', '__typename'].includes(fieldName));
    }

    $transformAllResult(result: any, originalResult: any[], info: AllResolverInfo<any>): OptionalPromise<Optional<any>> {

        if(result && isArray(result)){

            this.beforeTransformResult(result, info);
            const transformed = this.transformResult(result, info);
            this.afterTransformResult(result, transformed, info);

            return transformed;
        }
    }

    $transformRelationManyResult(relation: string, result: any, originalResult: any[], info: RelationResolverInfo<any>): OptionalPromise<Optional<any>> {

        if(result && isArray(result)){

            this.beforeTransformResult(result, info);
            const transformed = this.transformResult(result, info);
            this.afterTransformResult(result, transformed, info);

            return transformed;
        }
    }

    transformResult(items: any[], info: AllResolverInfo<any> | RelationResolverInfo<any>): any {

        return {
            items,
            totalCount: async () => {

                this.beforeGetTotalCount(items, info);
                const count = await this.getTotalCount(items, info);
                this.afterGetTotalCount(count, items, info);

                return count;
            }
        }
    }

    beforeTransformResult(items: any[], info: AllResolverInfo<any> | RelationResolverInfo<any>){}
    afterTransformResult(items: any[], transformedResult: any, info: AllResolverInfo<any> | RelationResolverInfo<any>){}

    async getTotalCount(items: any[], info: AllResolverInfo<any> | RelationResolverInfo<any>): Promise<number> {

        const queryBuilder = await info.helpers.getQueryBuilder({ count: true });
        return await queryBuilder.getCount();
    }

    beforeGetTotalCount(items: any[], info: AllResolverInfo<any> | RelationResolverInfo<any>){}
    afterGetTotalCount(count: number, items: any[], info: AllResolverInfo<any> | RelationResolverInfo<any>){}
}

export class ItemsPaginationPlugin extends CoreItemsPaginationPlugin implements Plugin {

    protected _hooks: IItemsPaginationPluginHooks | ConstructorType<IItemsPaginationPluginHooks>;

    hooks(hooks: IItemsPaginationPluginHooks | ConstructorType<IItemsPaginationPluginHooks>): this {

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
            return new ItemsPaginationPluginHooks()
        }
    }
}

export function itemsPaginationPlugin(): ItemsPaginationPlugin {

    return new ItemsPaginationPlugin();
}

export default itemsPaginationPlugin;
