import { FieldBuilder, FieldBuilderInfo } from "../../field";
import objectType, { ObjectTypeBuilder } from "../../objectType";
import { Plugin } from "../common";
import PluginError from "../PluginError";
import { BuildContext } from "../../Builder";

export class ItemsPaginationPlugin implements Plugin {

    beforeBuildField(builder: FieldBuilder, context: BuildContext, info: FieldBuilderInfo) {

        if(!info.list){
            return;
        }

        const typeName = info.type.toString();
        const targetType = context.rootSchema.findType(typeName, true);

        if(!targetType){
            throw new PluginError(`Items target type "${typeName}" not found`)
        }
        if(!(targetType instanceof ObjectTypeBuilder)){
            throw new PluginError(`Items target "${typeName}" is not an object type`);
        }

        const targetObjectInfo = targetType.info();

        const listObjectTypeName = `${typeName}List`
        const listObjectType = this._createListObjectType(listObjectTypeName, typeName);

        // Adopt rules from type
        listObjectType.allow(...Array.from(targetObjectInfo.allowedRoles));
        listObjectType.deny(...Array.from(targetObjectInfo.deniedRoles));

        context.schema.object(listObjectType);

        builder
            .type(listObjectTypeName)
            .list(false)
    }

    protected _createListObjectType(name: string, typeName: string): ObjectTypeBuilder {

        return objectType(name)
            .description(`Collection of ${typeName} nodes`)
            .field('items', typeName, _ => _.list().nonNull().description('List of the queried nodes'))
            .field('totalCount', 'Int', _ => _.nonNull().description('Total number of nodes'))
    }
}

export function itemsPaginationPlugin(): ItemsPaginationPlugin {

    return new ItemsPaginationPlugin();
}

export default itemsPaginationPlugin;