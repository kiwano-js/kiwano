import { expect, test } from 'vitest';

import type { FieldRuntime } from '@kiwano/core';

import modelSchema, { ModelEntityResolvers, ModelMutationResolvers, ModelQueryResolvers } from '../src/ts';

import { buildRootField, createFakeDataSource, TestDevice } from './helpers';

class DeviceQueryResolvers extends ModelQueryResolvers<any> {
    prefix = 'query';

    viewer() {
        return `${this.prefix}:viewer`;
    }
}

class DeviceMutationResolvers extends ModelMutationResolvers<any> {
    prefix = 'mutation';

    renameDevice() {
        return `${this.prefix}:renameDevice`;
    }
}

class DeviceSubscriptionResolvers {
    prefix = 'subscription';

    deviceUpdates(): FieldRuntime {
        return {
            subscribe() {
                return `${this.prefix}:subscribe`;
            },
            resolve() {
                return `${this.prefix}:resolve`;
            }
        };
    }
}

test('combines generated typeorm resolvers with custom query, mutation and subscription resolvers', async (): Promise<void> => {

    const dataSource = createFakeDataSource([
        {
            model: TestDevice,
            name: 'Device',
            columns: [
                { propertyName: 'id', type: 'uuid', isPrimary: true },
                { propertyName: 'name', type: 'varchar' }
            ]
        }
    ]);

    const builder = modelSchema(TestDevice, { dataSource })
        .find()
        .update()
        .query('viewer', 'Device')
        .mutation('renameDevice', 'Device', _ => _.arg('input', 'UpdateDeviceInput!'))
        .subscription('deviceUpdates', 'Device', _ => _.arg('id', 'ID!'))
        .queryResolvers(DeviceQueryResolvers)
        .mutationResolvers(DeviceMutationResolvers)
        .subscriptionResolvers(DeviceSubscriptionResolvers);

    await builder.finalize();

    expect((builder.compiledResolvers as any).Query).toBeInstanceOf(DeviceQueryResolvers);
    expect((builder.compiledResolvers as any).Mutation).toBeInstanceOf(DeviceMutationResolvers);
    expect((builder.compiledResolvers as any).Subscription).toBeInstanceOf(DeviceSubscriptionResolvers);
    expect((builder.compiledResolvers as any).Device).toBeInstanceOf(ModelEntityResolvers);

    expect(buildRootField(builder, 'Query', 'viewer').resolve?.()).toBe('query:viewer');
    expect(buildRootField(builder, 'Mutation', 'renameDevice').resolve?.()).toBe('mutation:renameDevice');

    const subscriptionField = buildRootField(builder, 'Subscription', 'deviceUpdates');

    expect(subscriptionField.subscribe?.()).toBe('subscription:subscribe');
    expect(subscriptionField.resolve?.()).toBe('subscription:resolve');
    expect(typeof buildRootField(builder, 'Query', 'device').resolve).toBe('function');
    expect(typeof buildRootField(builder, 'Mutation', 'updateDevice').resolve).toBe('function');
});