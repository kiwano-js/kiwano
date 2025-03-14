import type { ConstructorType } from "@kiwano/core";

import { ConnectionPaginationPlugin, type IConnectionPaginationPluginHooks } from "./connection";
import { FirstAfterPaginationPlugin, type IFirstAfterPaginationPluginHooks } from "./firstAfter";
import { MultiPlugin } from "../common";

export interface IRelayPaginationPluginHooks extends IFirstAfterPaginationPluginHooks, IConnectionPaginationPluginHooks {}

export class RelayPaginationPlugin extends MultiPlugin {

    protected _firstAfterPlugin: FirstAfterPaginationPlugin;
    protected _connectionPlugin: ConnectionPaginationPlugin;

    protected override getPlugins() {

        this._firstAfterPlugin = new FirstAfterPaginationPlugin();
        this._connectionPlugin = new ConnectionPaginationPlugin();

        return [this._firstAfterPlugin, this._connectionPlugin];
    }

    hooks(hooks: IRelayPaginationPluginHooks | ConstructorType<IRelayPaginationPluginHooks>): this {

        this._firstAfterPlugin.hooks(hooks);
        this._connectionPlugin.hooks(hooks);
        return this;
    }

    totalCount(): this;
    totalCount(totalCount: boolean): this;
    totalCount(totalCount = true): this {

        this._connectionPlugin.totalCount(totalCount);
        return this;
    }
}

export function relayPaginationPlugin(): RelayPaginationPlugin {

    return new RelayPaginationPlugin();
}

export default relayPaginationPlugin;
