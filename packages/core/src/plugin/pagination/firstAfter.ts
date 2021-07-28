import { FieldBuilder, FieldBuilderInfo } from "../../field";
import { Plugin } from "../common";
import { FinalizeContext } from "../../Builder";

export class FirstAfterPaginationPlugin implements Plugin {

    afterFinalizeField(builder: FieldBuilder, context: FinalizeContext, info: FieldBuilderInfo) {

        if(!info.list){
            return;
        }

        builder
            .arg('first', 'Int', _ => _.description('Number of nodes to return'))
            .arg('after', 'String', _ => _.description('Cursor for item after which results are to be selected'))
    }
}

export function firstAfterPaginationPlugin(): FirstAfterPaginationPlugin {

    return new FirstAfterPaginationPlugin();
}

export default firstAfterPaginationPlugin;