import { defaults } from "lodash";

import { FieldBuilder, FieldBuilderInfo } from "../../field";
import { Plugin } from "../common";
import { FinalizeContext } from "../../Builder";

export interface SearchFilterPluginOptions {
    argumentName?: string,
}

export const defaultSearchFilterPluginOptions: SearchFilterPluginOptions = {
    argumentName: 'search'
}

export class SearchFilterPlugin implements Plugin {

    protected _options: SearchFilterPluginOptions;

    constructor(options?: SearchFilterPluginOptions){

        this._options = defaults(options || {}, defaultSearchFilterPluginOptions);
    }

    afterFinalizeField(builder: FieldBuilder, context: FinalizeContext, info: FieldBuilderInfo) {

        if(!info.list){
            return;
        }

        builder.arg(this._options.argumentName, 'String', _ => _.description('Search query'))
    }
}

export function searchFilterPlugin(): SearchFilterPlugin {

    return new SearchFilterPlugin();
}

export default searchFilterPlugin;