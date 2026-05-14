import { expect, test } from 'vitest';

import { BuilderError, BuildContext, schema } from '../src/ts';

function buildSubscriptionField(builder: any, fieldName = 'messageCreated') {

    const subscriptionType = builder.locateType('Subscription')?.type as any;
    const buildContext = new BuildContext(builder, builder, new Map());
    const builtSubscriptionType = subscriptionType.build(buildContext);

    return builtSubscriptionType.getFields()[fieldName];
}

test('builds a subscription root object when subscription fields are added', async (): Promise<void> => {

    const builder = schema()
        .query('health', 'String')
        .subscription('messageCreated', 'String');

    await builder.finalize();

    const subscriptionField = buildSubscriptionField(builder);

    expect(builder.locateType('Subscription')?.type?.name).toBe('Subscription');
    expect(subscriptionField).toBeDefined();
});

test('supports subscription descriptor objects and binds subscribe/resolve to the resolver container', async (): Promise<void> => {

    const builder = schema()
        .query('health', 'String')
        .subscription('messageCreated', 'String')
        .subscriptionResolvers({
            prefix: 'object',
            messageCreated: {
                subscribe() {
                    return this.prefix;
                },
                resolve(payload: string) {
                    return `${this.prefix}:${payload}`;
                }
            }
        });

    await builder.finalize();

    const subscriptionField = buildSubscriptionField(builder);

    expect(subscriptionField.subscribe?.()).toBe('object');
    expect(subscriptionField.resolve?.('payload')).toBe('object:payload');
});

test('supports class-based subscription resolver factories and applies subscription acl rules during finalize', async (): Promise<void> => {

    class SubscriptionResolvers {
        prefix = 'class';

        messageCreated() {
            return {
                subscribe() {
                    return this.prefix;
                },
                resolve(payload: string) {
                    return `${this.prefix}:${payload}`;
                }
            };
        }
    }

    const builder = schema()
        .query('health', 'String')
        .subscription('messageCreated', 'String')
        .subscriptionResolvers(SubscriptionResolvers)
        .allowSubscription('admin')
        .denySubscription('guest');

    await builder.finalize();

    expect((builder.compiledResolvers as any).Subscription).toBeInstanceOf(SubscriptionResolvers);

    const subscriptionField = buildSubscriptionField(builder);

    expect(subscriptionField.subscribe?.()).toBe('class');
    expect(subscriptionField.resolve?.('payload')).toBe('class:payload');

    const subscriptionType = builder.locateType('Subscription')?.type as any;
    const subscriptionBuilderField = subscriptionType.info().fields[0];
    const fieldInfo = subscriptionBuilderField.info();

    expect(fieldInfo.allowedRoles.has('admin')).toBe(true);
    expect(fieldInfo.deniedRoles.has('guest')).toBe(true);
});

test('supports existing subscription resolver instances', async (): Promise<void> => {

    class SubscriptionResolvers {
        prefix = 'instance';

        messageCreated() {
            return {
                subscribe() {
                    return this.prefix;
                },
                resolve(payload: string) {
                    return `${this.prefix}:${payload}`;
                }
            };
        }
    }

    const resolverInstance = new SubscriptionResolvers();

    const builder = schema()
        .query('health', 'String')
        .subscription('messageCreated', 'String')
        .subscriptionResolvers(resolverInstance);

    await builder.finalize();

    expect((builder.compiledResolvers as any).Subscription).toBe(resolverInstance);

    const subscriptionField = buildSubscriptionField(builder);

    expect(subscriptionField.subscribe?.()).toBe('instance');
    expect(subscriptionField.resolve?.('payload')).toBe('instance:payload');
});

test('throws for invalid subscription resolver factory responses', async (): Promise<void> => {

    const builder = schema()
        .query('health', 'String')
        .subscription('messageCreated', 'String')
        .subscriptionResolvers({
            messageCreated() {
                return 'invalid';
            }
        });

    await builder.finalize();

    expect(() => buildSubscriptionField(builder)).toThrowError(BuilderError);
    expect(() => buildSubscriptionField(builder)).toThrow('must return an object with a subscribe function');
});
