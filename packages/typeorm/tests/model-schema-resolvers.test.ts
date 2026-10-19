import { graphql, parse, subscribe, type ExecutionResult } from 'graphql';
import { expect, test, vi } from 'vitest';

import { aclPlugin, ForbiddenError, schema, type FieldRuntime, type ResolverInfo } from '@kiwano/core';

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

test('runs subscription access hooks once alongside generated TypeORM resolvers in a merged schema', async (): Promise<void> => {

    const device = { id: '1', name: 'Device' };
    const canAccess = vi.fn(function(this: { prefix: string }, input: ResolverInfo<unknown>): boolean {

        expect(this.prefix).toBe('subscription');
        return input.context.allowed;
    });
    const canSubscribe = vi.fn(() => true);
    const canResolve = vi.fn(() => true);
    const resolve = vi.fn(function(this: { prefix: string }, source): typeof device {

        expect(this.prefix).toBe('subscription');
        return source;
    });

    class SubscriptionResolvers {
        prefix = 'subscription';

        deviceUpdates(): FieldRuntime {

            return {
                canAccess,
                canSubscribe,
                canResolve,
                async *subscribe(): AsyncGenerator<typeof device> {

                    expect(this.prefix).toBe('subscription');
                    yield device;
                    yield device;
                },
                resolve
            };
        }
    }

    const dataSource = createFakeDataSource([{
        model: TestDevice,
        name: 'Device',
        columns: [
            { propertyName: 'id', type: 'uuid', isPrimary: true },
            { propertyName: 'name', type: 'varchar' }
        ]
    }]);
    const models = modelSchema(TestDevice, { dataSource })
        .find()
        .subscription('deviceUpdates', 'Device', field => field.arg('id', 'ID!'))
        .subscriptionResolvers(SubscriptionResolvers);
    const builtSchema = await schema()
        .merge(models)
        .use(aclPlugin().role('member'))
        .allow('member')
        .build();
    const context = { role: 'member', allowed: true };
    const result = await graphql({
        schema: builtSchema,
        source: '{ device(id: "1") { name } }',
        rootValue: { device },
        contextValue: context
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ device: { name: 'Device' } });
    expect(canAccess).not.toHaveBeenCalled();

    const stream = await subscribe({
        schema: builtSchema,
        document: parse('subscription { deviceUpdates(id: "1") { name } }'),
        contextValue: context
    }) as AsyncIterableIterator<ExecutionResult>;

    expect(canAccess).toHaveBeenCalledOnce();
    expect(canSubscribe).toHaveBeenCalledOnce();
    expect(canResolve).not.toHaveBeenCalled();
    expect((await stream.next()).value.data).toEqual({ deviceUpdates: { name: 'Device' } });

    context.allowed = false;
    const denied = (await stream.next()).value;

    expect(denied.errors?.[0].originalError).toBeInstanceOf(ForbiddenError);
    expect(canAccess).toHaveBeenCalledTimes(3);
    expect(canSubscribe).toHaveBeenCalledOnce();
    expect(canResolve).toHaveBeenCalledOnce();
    expect(resolve).toHaveBeenCalledOnce();
    await stream.return?.();
});
