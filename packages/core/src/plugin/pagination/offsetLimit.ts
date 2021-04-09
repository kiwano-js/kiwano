import { FieldBuilder } from "../../field";
import { Plugin } from "../common";
import { BuildContext } from "../../Builder";

export class OffsetLimitPaginationPlugin implements Plugin {

    beforeBuildField(builder: FieldBuilder, context: BuildContext) {

        const info = builder.info();
        if(!info.list){
            return;
        }

        builder
            .arg('offset', 'Int', _ => _.description('Offset for the nodes to return'))
            .arg('limit', 'Int', _ => _.description('Number of nodes to return'))
    }
}

export function offsetLimitPaginationPlugin(): OffsetLimitPaginationPlugin {

    return new OffsetLimitPaginationPlugin();
}

export default offsetLimitPaginationPlugin;