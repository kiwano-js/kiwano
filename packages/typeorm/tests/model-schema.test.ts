import { expect, test } from 'vitest';

import { EntityFieldType, entityFieldTypeExtensionName } from '@kiwano/core';

import modelSchema, { ModelEntityResolvers, ModelMutationResolvers, ModelQueryResolvers, resolverOptionsExtensionName } from '../src/ts';

import { createFakeDataSource, TestDevice, TestOwner } from './helpers';

test('generates model fields, input objects and resolver metadata for the use cases present in the backend schemas', async (): Promise<void> => {

    const dataSource = createFakeDataSource([
        {
            model: TestDevice,
            name: 'Device',
            columns: [
                { propertyName: 'id', type: 'uuid', isPrimary: true },
                { propertyName: 'name', type: 'varchar', comment: 'Device name' },
                { propertyName: 'ownerId', databaseName: 'owner_id', type: 'uuid' }
            ],
            relations: [
                {
                    propertyName: 'owner',
                    inverseEntityMetadata: { name: 'Owner' },
                    isNullable: false,
                    joinColumns: [{ propertyName: 'ownerId' }]
                }
            ]
        },
        {
            model: TestOwner,
            name: 'Owner',
            columns: [
                { propertyName: 'id', type: 'uuid', isPrimary: true },
                { propertyName: 'label', type: 'varchar' }
            ]
        }
    ]);

    const builder = modelSchema(TestDevice, { dataSource })
        .entity(_ => _.field('displayName', 'String'))
        .find()
        .all()
        .create()
        .update()
        .updateInput(_ => _
            .exclude('name')
            .field('secret', 'String')
        )
        .delete();

    await builder.finalize();

    const entityType = builder.locateType('Device')?.type as any;
    const entityFieldInfos = entityType.info().fields.map((field: any) => field.info());
    const entityFieldNames = entityFieldInfos.map((field: any) => field.name);

    expect(entityFieldNames).toEqual(expect.arrayContaining(['id', 'name', 'owner', 'displayName']));
    expect(entityFieldInfos.find((field: any) => field.name === 'id').type).toBe('ID');
    expect(entityFieldInfos.find((field: any) => field.name === 'name').description).toBe('Device name');

    const ownerFieldInfo = entityFieldInfos.find((field: any) => field.name === 'owner');
    expect(ownerFieldInfo.type).toBe('Owner');
    expect(ownerFieldInfo.extensions.get(entityFieldTypeExtensionName)).toBe(EntityFieldType.RELATION);
    expect(typeof ownerFieldInfo.extensions.get(resolverOptionsExtensionName)).toBe('function');

    const queryFieldInfos = (builder.locateType('Query')?.type as any).info().fields.map((field: any) => field.info());
    const mutationFieldInfos = (builder.locateType('Mutation')?.type as any).info().fields.map((field: any) => field.info());

    expect(queryFieldInfos.map((field: any) => field.name)).toEqual(expect.arrayContaining(['device', 'devices']));
    expect(mutationFieldInfos.map((field: any) => field.name)).toEqual(expect.arrayContaining(['createDevice', 'updateDevice', 'deleteDevice']));
    expect(queryFieldInfos.find((field: any) => field.name === 'device').arguments[0].name).toBe('id');
    expect(mutationFieldInfos.find((field: any) => field.name === 'createDevice').arguments[0].name).toBe('input');

    const createInput = builder.locateType('CreateDeviceInput')?.type as any;
    const updateInput = builder.locateType('UpdateDeviceInput')?.type as any;
    const createInputFields = createInput.info().fields.map((field: any) => field.info());
    const updateInputFields = updateInput.info().fields.map((field: any) => field.info());

    expect(createInputFields.map((field: any) => field.name)).toEqual(expect.arrayContaining(['name', 'displayName']));
    expect(createInputFields.map((field: any) => field.name)).not.toContain('id');
    expect(updateInputFields.map((field: any) => field.name)).toEqual(expect.arrayContaining(['id', 'displayName', 'secret']));
    expect(updateInputFields.map((field: any) => field.name)).not.toContain('name');
    expect(updateInputFields.find((field: any) => field.name === 'id').nonNull).toBe(true);

    expect((builder.compiledResolvers as any).Query).toBeInstanceOf(ModelQueryResolvers);
    expect((builder.compiledResolvers as any).Mutation).toBeInstanceOf(ModelMutationResolvers);
    expect((builder.compiledResolvers as any).Device).toBeInstanceOf(ModelEntityResolvers);
});
