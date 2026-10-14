import { graphql } from 'graphql';
import { expect, test, vi } from 'vitest';

import { aclPlugin, schema } from '../src/ts';

test.each(['Query', 'Mutation'])('specific admin grants restrict schema grants for %s', async scope => {

    const secret = vi.fn(() => 'private');
    const builder = schema('specific').allow('member').use(aclPlugin())
        .query('public', 'String', field => field.resolver(() => 'public'));
    if(scope === 'Query'){

        builder.query('secret', 'String', field => field.allow('admin').resolver(secret));
    }
    else {

        builder.mutation('secret', 'String', field => field.allow('admin').resolver(secret));
    }

    const built = await builder.build();
    const source = scope === 'Query' ? '{ secret }' : 'mutation { secret }';
    const denied = await graphql({ schema: built, source, contextValue: { role: 'member' } });

    expect(denied.data?.secret).toBeNull();
    expect(secret).not.toHaveBeenCalled();

    const allowed = await graphql({ schema: built, source, contextValue: { role: 'admin' } });
    expect(allowed.data?.secret).toBe('private');

    const inherited = await graphql({ schema: built, source: '{ public }', contextValue: { role: 'member' } });
    expect(inherited.data?.public).toBe('public');
});

test('a field allow-list restricts a type wildcard while preserving admin inheritance', async () => {

    const acl = aclPlugin().role('member').role('admin', 'member');
    const built = await schema('nested').use(acl)
        .query('account', 'Account', field => field.allow('member').resolver(() => ({ secret: 'private', public: 'public' })))
        .object('Account', object => object.allow('member')
            .field('secret', 'String', field => field.allow('admin'))
            .field('public', 'String'))
        .build();

    const member = await graphql({ schema: built, source: '{ account { secret public } }', contextValue: { role: 'member' } });
    expect(member.data?.account).toEqual({ secret: null, public: 'public' });

    const admin = await graphql({ schema: built, source: '{ account { secret public } }', contextValue: { role: 'admin' } });
    expect(admin.errors).toBeUndefined();
    expect(admin.data?.account).toEqual({ secret: 'private', public: 'public' });
});

test('a specific object allow-list restricts an inherited schema grant', async () => {

    const built = await schema('objects').allow('member').use(aclPlugin())
        .query('account', 'Account', field => field.resolver(() => ({ secret: 'private' })))
        .object('Account', object => object.allow('admin').field('secret', 'String'))
        .build();
    const result = await graphql({ schema: built, source: '{ account { secret } }', contextValue: { role: 'member' } });

    expect(result.data?.account).toEqual({ secret: null });
});

test('a specific child schema grant is not broadened by its parent', async () => {

    const child = schema('child').allow('admin')
        .query('secret', 'String', field => field.resolver(() => 'private'));
    const built = await schema('parent').allow('member').use(aclPlugin())
        .query('public', 'String', field => field.resolver(() => 'public'))
        .merge(child).build();
    const result = await graphql({ schema: built, source: '{ secret public }', contextValue: { role: 'member' } });

    expect(result.data).toEqual({ secret: null, public: 'public' });
});
