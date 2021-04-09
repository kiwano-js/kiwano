import MultiPlugin from "../MultiPlugin";
import { ConnectionPaginationPlugin } from "./connection";
import { FirstAfterPaginationPlugin } from "./firstAfter";

export class RelayPaginationPlugin extends MultiPlugin {

    protected _firstAfterPlugin: FirstAfterPaginationPlugin;
    protected _connectionPlugin: ConnectionPaginationPlugin;

    protected getPlugins() {

        this._firstAfterPlugin = new FirstAfterPaginationPlugin();
        this._connectionPlugin = new ConnectionPaginationPlugin();

        return [this._firstAfterPlugin, this._connectionPlugin];
    }

    totalCount(): this;
    totalCount(totalCount: boolean): this;
    totalCount(totalCount: boolean = true): this {

        this._connectionPlugin.totalCount(totalCount);
        return this;
    }
}

export function relayPaginationPlugin(): RelayPaginationPlugin {

    return new RelayPaginationPlugin();
}

export default relayPaginationPlugin;