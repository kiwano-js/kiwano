import { expect, test } from 'vitest';

import { descriptiveNamingStrategy, entitySchema, schema } from '../src/ts';

test('propagates naming and root query acl rules to merged schemas as used by the backend bootstrap', async (): Promise<void> => {

    const deviceSchema = entitySchema('device')
        .find()
        .all();

    const rootSchema = schema()
        .naming(descriptiveNamingStrategy())
        .allowQuery('root-allowed')
        .denyQuery('root-denied')
        .merge(deviceSchema);

    await rootSchema.finalize();

    const queryType = deviceSchema.locateType('Query')?.type as any;
    const fieldInfos = queryType.info().fields.map((field: any) => field.info());
    const fieldNames = fieldInfos.map((field: any) => field.name);

    expect(fieldNames).toContain('findDevice');
    expect(fieldNames).toContain('allDevices');

    for(const fieldInfo of fieldInfos){
        expect(fieldInfo.allowedRoles.has('root-allowed')).toBe(true);
        expect(fieldInfo.deniedRoles.has('root-denied')).toBe(true);
    }
});