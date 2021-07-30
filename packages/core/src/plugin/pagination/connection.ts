import { FieldBuilder, FieldBuilderInfo } from "../../field";
import objectType, { ObjectTypeBuilder } from "../../objectType";
import { Plugin } from "../common";
import PluginError from "../PluginError";
import { BuildContext } from "../../Builder";

const PageInfoObjectTypeName = "PageInfo";

export class ConnectionPaginationPlugin implements Plugin {

    protected _totalCount = false;

    totalCount(): this;
    totalCount(totalCount: boolean): this;
    totalCount(totalCount: boolean = true): this {

        this._totalCount = totalCount;
        return this;
    }

    beforeBuildField(builder: FieldBuilder, context: BuildContext, info: FieldBuilderInfo) {

        if(!info.list){
            return;
        }

        // Create edges type
        if(!context.schema.hasType(PageInfoObjectTypeName)){
            context.schema.object(this._createPageInfoObjectType());
        }

        const typeName = info.type.toString();
        const targetType = context.rootSchema.findType(typeName, true);

        if(!targetType){
            throw new PluginError(`Edges target type "${typeName}" not found`)
        }
        if(!(targetType instanceof ObjectTypeBuilder)){
            throw new PluginError(`Edges target "${typeName}" is not an object type`);
        }

        const targetObjectInfo = targetType.info();

        const pageInfoType = context.schema.findType(PageInfoObjectTypeName) as ObjectTypeBuilder;
        pageInfoType.allow(...Array.from(targetObjectInfo.allowedRoles));
        pageInfoType.deny(...Array.from(targetObjectInfo.deniedRoles));

        const edgeObjectTypeName = `${typeName}Edge`
        const edgeObjectType = this._createEdgeObjectType(edgeObjectTypeName, typeName);

        edgeObjectType.allow(...Array.from(targetObjectInfo.allowedRoles));
        edgeObjectType.deny(...Array.from(targetObjectInfo.deniedRoles));

        context.schema.object(edgeObjectType);

        const connectionObjectTypeName = `${typeName}Connection`
        const connectionObjectType = this._createConnectionObjectType(connectionObjectTypeName, edgeObjectTypeName);

        connectionObjectType.allow(...Array.from(targetObjectInfo.allowedRoles));
        connectionObjectType.deny(...Array.from(targetObjectInfo.deniedRoles));

        context.schema.object(connectionObjectType);

        builder
            .type(connectionObjectTypeName)
            .list(false)
    }

    protected _createPageInfoObjectType(): ObjectTypeBuilder {

        return objectType(PageInfoObjectTypeName)
            .description('Provides information about the paging state')
            .field('hasNextPage', 'Boolean', _ => _.nonNull().description('Indicates whether there is a next page'))
            .field('hasPreviousPage', 'Boolean', _ => _.nonNull().description('Indicates whether there is a previous page'))
            .field('startCursor', 'String', _ => _.description('Cursor for the first node'))
            .field('endCursor', 'String', _ => _.description('Cursor for the last node'))
    }

    protected _createConnectionObjectType(name: string, edgeTypeName: string): ObjectTypeBuilder {

        const type = objectType(name)
            .description(`Connection with ${edgeTypeName}`)
            .field('pageInfo', PageInfoObjectTypeName, _ => _.nonNull().description('Provides information about the paging state'))
            .field('edges', edgeTypeName, _ => _.list().description('List of the queried edges'));

        if(this._totalCount){
            type.field('totalCount', 'Int', _ => _.nonNull().description('Total number of nodes'));
        }

        return type;
    }

    protected _createEdgeObjectType(name: string, typeName: string): ObjectTypeBuilder {

        return objectType(name)
            .description(`${typeName} edge`)
            .field('node', typeName, _ => _.description('Current node'))
            .field('cursor', 'String', _ => _.nonNull().description('Cursor for the current node'))
    }
}

export function connectionPaginationPlugin(): ConnectionPaginationPlugin {

    return new ConnectionPaginationPlugin();
}

export default connectionPaginationPlugin;