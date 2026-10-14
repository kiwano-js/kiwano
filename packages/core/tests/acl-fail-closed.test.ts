import { graphql } from 'graphql';
import { expect, test, vi } from 'vitest';

import { aclPlugin, schema } from '../src/ts';

test.each(['Query', 'Mutation', 'Account'])('returning callbacks cannot authorize denied %s fields', async (scope): Promise<void> => {

    const resolver = vi.fn(() => 'secret');
    const onForbidden = vi.fn(async (): Promise<void> => {});
    const builder = schema('fail-closed').use(aclPlugin({ onForbidden }).role('member'))
        .query('health', 'String', field => field.allow('member').resolver(() => 'ok'));
    let source: string;

    if(scope === 'Account'){

        builder.object('Account', object => object.field('secret', 'String', field => field.allow('admin').resolver(resolver)))
            .query('account', 'Account', field => field.allow('member').resolver(() => ({})));
        source = '{ account { secret } }';
    }
    else if(scope === 'Mutation'){

        builder.mutation('secret', 'String', field => field.allow('admin').resolver(resolver));
        source = 'mutation { secret }';
    }
    else {

        builder.query('secret', 'String', field => field.allow('admin').resolver(resolver));
        source = '{ secret }';
    }

    const result = await graphql({ schema: await builder.build(), source, contextValue: { role: 'member' } });

    expect(result.errors?.[0].message).toBe(`No access to ${scope}.secret`);
    expect(onForbidden).toHaveBeenCalledOnce();
    expect(resolver).not.toHaveBeenCalled();
});

test('Hono awaits a callback and blocks next even when it returns', async (): Promise<void> => {

    const next = vi.fn();
    const onForbidden = vi.fn(async (): Promise<void> => {});
    const acl = aclPlugin({ onForbidden }).role('member');
    const context = { req: { path: '/secret' }, get: () => 'member' };

    await expect(acl.middleware()(context, next)).rejects.toThrow('No access to /secret');
    expect(onForbidden).toHaveBeenCalledOnce();
    expect(next).not.toHaveBeenCalled();
});

test('preserves a custom denial error and allowed resolver execution', async (): Promise<void> => {

    const error = new Error('custom denial');
    const acl = aclPlugin({ onForbidden: async (): Promise<void> => { throw error; } }).allow('/public', 'member');
    const next = vi.fn(async () => 'ok');

    await expect(acl.middleware()({ req: { path: '/secret' }, get: () => 'member' }, next)).rejects.toBe(error);
    await expect(acl.middleware()({ req: { path: '/public' }, get: () => 'member' }, next)).resolves.toBe('ok');
    expect(next).toHaveBeenCalledOnce();
});
