import { ConstructorType } from "@kiwano/core";

import { IOffsetLimitPaginationPluginHooks, OffsetLimitPaginationPlugin } from "./offsetLimit";
import { IItemsPaginationPluginHooks, ItemsPaginationPlugin } from "./items";
import { MultiPlugin } from "../common";

export interface ISimplePaginationPluginHooks extends IOffsetLimitPaginationPluginHooks, IItemsPaginationPluginHooks {}

export class SimplePaginationPlugin extends MultiPlugin {

    protected _offsetLimitPlugin: OffsetLimitPaginationPlugin;
    protected _itemsPlugin: ItemsPaginationPlugin;

    protected getPlugins(){

        this._offsetLimitPlugin = new OffsetLimitPaginationPlugin()
        this._itemsPlugin = new ItemsPaginationPlugin()

        return [this._offsetLimitPlugin, this._itemsPlugin];
    }

    hooks(hooks: ISimplePaginationPluginHooks | ConstructorType<ISimplePaginationPluginHooks>): this {

        this._offsetLimitPlugin.hooks(hooks);
        this._itemsPlugin.hooks(hooks);
        return this;
    }
}

export function simplePaginationPlugin(): SimplePaginationPlugin {

    return new SimplePaginationPlugin();
}

export default simplePaginationPlugin;