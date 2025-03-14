import MultiPlugin from "../MultiPlugin";
import { OffsetLimitPaginationPlugin } from "./offsetLimit";
import { ItemsPaginationPlugin } from "./items";
import type { Plugin } from "../common";

export class SimplePaginationPlugin extends MultiPlugin {

    protected override getPlugins(): Plugin[] {

        return [new OffsetLimitPaginationPlugin(), new ItemsPaginationPlugin()];
    }
}

export function simplePaginationPlugin(): SimplePaginationPlugin {

    return new SimplePaginationPlugin();
}

export default simplePaginationPlugin;
