import { BuildContext } from '@kiwano/core';

type FakeColumn = {
    propertyName: string
    databaseName?: string
    type?: unknown
    isNullable?: boolean
    isArray?: boolean
    isPrimary?: boolean
    enumName?: string
    comment?: string
}

type FakeRelation = {
    propertyName: string
    inverseEntityMetadata: { name: string }
    isNullable?: boolean
    isOneToMany?: boolean
    isManyToMany?: boolean
    joinColumns?: Array<{ propertyName: string }>
}

type FakeMetadataConfig = {
    model: Function
    name: string
    tablePath?: string
    columns: FakeColumn[]
    relations?: FakeRelation[]
}

export class TestDevice {}
export class TestOwner {}

export function createFakeDataSource(configs: FakeMetadataConfig[]) {

    const metadataByModel = new Map<any, any>();
    const tablesByPath = new Map<string, Record<string, any>>();

    for(const config of configs){

        const tablePath = config.tablePath || config.name.toLowerCase();
        const columns = config.columns.map(column => ({
            isNullable: false,
            isArray: false,
            isPrimary: false,
            databaseName: column.propertyName,
            ...column
        }));

        metadataByModel.set(config.model, {
            name: config.name,
            tablePath,
            columns,
            primaryColumns: columns.filter(column => column.isPrimary),
            relations: (config.relations || []).map(relation => ({
                isNullable: true,
                isOneToMany: false,
                isManyToMany: false,
                joinColumns: [],
                ...relation
            }))
        });

        tablesByPath.set(tablePath, Object.fromEntries(columns.map(column => [column.databaseName, {
            type: column.type,
            isNullable: column.isNullable,
            isArray: column.isArray,
            comment: column.comment
        }])));
    }

    return {
        getMetadata(model: any) {
            return metadataByModel.get(model);
        },
        createQueryRunner() {
            return {
                async getTable(tablePath: string) {
                    const columns = tablesByPath.get(tablePath);
                    if(!columns){
                        return null;
                    }

                    return {
                        findColumnByName(name: string) {
                            return columns[name] || null;
                        }
                    };
                },
                async release() {}
            };
        }
    } as any;
}

export function buildRootField(builder: any, rootTypeName: 'Query' | 'Mutation' | 'Subscription', fieldName: string) {

    const rootType = builder.locateType(rootTypeName)?.type as any;
    const buildContext = new BuildContext(builder, builder, new Map());
    const builtRootType = rootType.build(buildContext);

    return builtRootType.getFields()[fieldName];
}