import isArray from 'lodash/isArray'
import first from 'lodash/first'
import last from 'lodash/last'

import {
    ConnectionPaginationPlugin as CoreConnectionPaginationPlugin,
    ConstructorType,
    ensureInstantiated,
    Optional,
    OptionalPromise
} from "@kiwano/core"

import { offsetToCursor, Plugin } from "../common";
import { AllResolverBaseHooks, AllResolverInfo, RelationResolverBaseHooks, RelationResolverInfo } from "../../resolver";

export interface IConnectionPaginationPluginHooks extends AllResolverBaseHooks<any, any>, RelationResolverBaseHooks<any, any> {}

export class ConnectionPaginationPluginHooks implements IConnectionPaginationPluginHooks {

    $transformAllResult(result: any, originalResult: any[], info: AllResolverInfo<any>): OptionalPromise<Optional<any>> {

        if(result && originalResult && isArray(result)){

            this.beforeTransformResult(result, info);
            const transformed = this.transformResult(result, originalResult, info);
            this.afterTransformResult(result, transformed, info);

            return transformed;
        }
    }

    $transformRelationManyResult(relation: string, result: any, originalResult: object[], info: RelationResolverInfo<any>): OptionalPromise<Optional<any>> {

        if(result && originalResult && isArray(result)){

            this.beforeTransformResult(result, info);
            const transformed = this.transformResult(result, originalResult, info);
            this.afterTransformResult(result, transformed, info);

            return transformed;
        }
    }

    transformResult(items: any[], originalItems: any[], info: AllResolverInfo<any> | RelationResolverInfo<any>): any {

        let edges = [];
        let counter = 0;

        let firstIndex = null;
        let lastIndex = null;

        for(let item of originalItems){

            if(items.indexOf(item) >= 0){

                edges.push({
                    cursor: offsetToCursor(counter),
                    node: item
                });

                if(firstIndex === null){
                    firstIndex = counter;
                }

                lastIndex = counter;
            }

            counter++;
        }

        const firstEdge = first(edges);
        const lastEdge = last(edges);

        return {
            edges,
            pageInfo: {
                startCursor: firstEdge ? firstEdge.cursor : null,
                endCursor: lastEdge ? lastEdge.cursor : null,
                hasPreviousPage: firstIndex > 0,
                hasNextPage: lastIndex < originalItems.length - 1
            },
            totalCount: async () => {

                this.beforeGetTotalCount(items, originalItems, info);
                const count = await this.getTotalCount(items, originalItems, info);
                this.afterGetTotalCount(count, items, originalItems, info);

                return count;
            }
        }
    }

    beforeTransformResult(items: any[], info: AllResolverInfo<any> | RelationResolverInfo<any>){}
    afterTransformResult(items: any[], transformedResult: any, info: AllResolverInfo<any> | RelationResolverInfo<any>){}

    getTotalCount(items: any[], originalItems: any[], info: AllResolverInfo<any> | RelationResolverInfo<any>): OptionalPromise<number> {

        return originalItems.length;
    }

    beforeGetTotalCount(items: any[], originalItems: any[], info: AllResolverInfo<any> | RelationResolverInfo<any>){}
    afterGetTotalCount(count: number, items: any[], originalItems: any[], info: AllResolverInfo<any> | RelationResolverInfo<any>){}
}

export class ConnectionPaginationPlugin extends CoreConnectionPaginationPlugin implements Plugin {

    protected _hooks: IConnectionPaginationPluginHooks | ConstructorType<IConnectionPaginationPluginHooks>;

    hooks(hooks: IConnectionPaginationPluginHooks | ConstructorType<IConnectionPaginationPluginHooks>): this {

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
            return new ConnectionPaginationPluginHooks()
        }
    }
}

export function connectionPaginationPlugin(): ConnectionPaginationPlugin {

    return new ConnectionPaginationPlugin();
}

export default connectionPaginationPlugin;