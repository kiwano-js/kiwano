import { parse, subscribe } from 'graphql';
import { expect, test, vi } from 'vitest';

import { aclPlugin, schema } from '../src/ts';

async function fixture(customResolve: boolean, merge = false) : Promise<{ built: import('graphql').GraphQLSchema; source: ReturnType<typeof vi.fn>; resolve: ReturnType<typeof vi.fn> }> {

    const source = vi.fn(() => (async function* () : AsyncGenerator<{ updates: string }> {

        yield { updates: 'first private event' };
        yield { updates: 'second private event' };
    })());
    const resolve = vi.fn(payload => payload.updates);
    const descriptor = customResolve ? { subscribe: source, resolve } : { subscribe: source };
    const builder = schema('subscription-security')
        .use(aclPlugin().role('member').role('admin'))
        .query('health', 'String', field => field.allow('member', 'admin').resolver(() => 'ok'))
        .subscription('updates', 'String', field => field.allow('admin'))
        .subscriptionResolvers({ updates: descriptor });
    const built = await (merge ? schema('outer').query('ping', 'String').merge(builder) : builder).build();

    return { built, source, resolve };
}

test.each([true, false])('denies source creation with custom resolve=%s', async (customResolve): Promise<void> => {

    const { built, source, resolve } = await fixture(customResolve);
    const result = await subscribe({
        schema: built, document: parse('subscription { visible: updates }'), contextValue: { role: 'member' }
    });

    expect((result as any).errors?.[0].message).toBe('No access to Subscription.updates');
    expect(source).not.toHaveBeenCalled();
    expect(resolve).not.toHaveBeenCalled();
});

test.each([true, false])('checks changed role for each event with custom resolve=%s', async (customResolve): Promise<void> => {

    const { built, source, resolve } = await fixture(customResolve);
    const context = { role: 'admin' };
    const stream = await subscribe({
        schema: built, document: parse('subscription { visible: updates }'), contextValue: context
    }) as AsyncIterableIterator<any>;

    const first = await stream.next();
    expect(first.value.errors).toBeUndefined();
    expect(first.value.data).toEqual({ visible: 'first private event' });
    expect(source).toHaveBeenCalledOnce();

    context.role = 'member';
    const second = await stream.next();
    expect(second.value.data).toEqual({ visible: null });
    expect(second.value.errors[0].message).toBe('No access to Subscription.updates');
    expect(second.value.errors[0].path).toEqual(['visible']);
    expect(resolve).toHaveBeenCalledTimes(customResolve ? 1 : 0);
    await stream.return?.();
});

test('guards subscriptions originating in a child schema', async (): Promise<void> => {

    const child = await fixture(true, true);
    const result = await subscribe({
        schema: child.built, document: parse('subscription { updates }'), contextValue: {}
    });

    expect((result as any).errors?.[0].message).toBe('No access to Subscription.updates');
    expect(child.source).not.toHaveBeenCalled();
});
