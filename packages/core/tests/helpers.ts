import { BuildContext } from '../src/ts';

export function buildRootField(builder: any, rootTypeName: 'Query' | 'Mutation' | 'Subscription', fieldName: string) {

    const rootType = builder.locateType(rootTypeName)?.type as any;
    const buildContext = new BuildContext(builder, builder, new Map());
    const builtRootType = rootType.build(buildContext);

    return builtRootType.getFields()[fieldName];
}

export function getRootFieldInfo(builder: any, rootTypeName: 'Query' | 'Mutation' | 'Subscription', fieldName: string) {

    const rootType = builder.locateType(rootTypeName)?.type as any;
    return rootType.info().fields.find((field: any) => field.name === fieldName)?.info();
}