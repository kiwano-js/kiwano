import { graphql } from 'graphql';
import { expect, test } from 'vitest';

import { aclPlugin, schema } from '../src/ts';

test('rejects shared schema namespaces before widening an already built schema', async () => {

    const acl = aclPlugin().role('member').role('admin');
    const restricted = await schema('same-name').use(acl)
        .query('secret', 'String', field => field.allow('admin').resolver(() => 'private'))
        .build();

    await expect(schema('same-name').use(acl)
        .query('secret', 'String', field => field.allow('member').resolver(() => 'public'))
        .build()).rejects.toThrow('already bound to another schema');

    const result = await graphql({ schema: restricted, source: '{ secret }', contextValue: { role: 'member' } });
    expect(result.data?.secret).toBeNull();
});

test('distinct namespaces can still share explicitly configured plugin rules', async () => {

    const acl = aclPlugin().role('member').role('admin');
    const restricted = await schema('private').use(acl)
        .query('secret', 'String', field => field.allow('admin').resolver(() => 'private'))
        .build();
    const open = await schema('public').use(acl)
        .query('secret', 'String', field => field.allow('member').resolver(() => 'public'))
        .build();

    const denied = await graphql({ schema: restricted, source: '{ secret }', contextValue: { role: 'member' } });
    const allowed = await graphql({ schema: open, source: '{ secret }', contextValue: { role: 'member' } });
    expect(denied.data?.secret).toBeNull();
    expect(allowed.data?.secret).toBe('public');
});

test('rejects incompatible ACL declarations for a merged type field', async () => {

    const restricted = schema('private')
        .query('privateAccount', 'Account', field => field.allow('member').resolver(() => ({ secret: 'private' })))
        .object('Account', object => object.field('secret', 'String', field => field.allow('admin')));
    const open = schema('public')
        .query('publicAccount', 'Account', field => field.allow('member').resolver(() => ({ secret: 'public' })))
        .object('Account', object => object.field('secret', 'String', field => field.allow('member')));

    await expect(schema('merged').use(aclPlugin()).merge(restricted).merge(open).build())
        .rejects.toThrow('Conflicting ACL declarations for "merged:Account.secret"');
});

test('merges equivalent policies even when role declarations have a different order', async () => {

    const first = schema('one')
        .query('one', 'Account', field => field.allow('member').resolver(() => ({ secret: 'one' })))
        .object('Account', object => object.field('secret', 'String', field => field.allow('member', 'admin')));
    const second = schema('two')
        .query('two', 'Account', field => field.allow('member').resolver(() => ({ secret: 'two' })))
        .object('Account', object => object.field('secret', 'String', field => field.allow('admin', 'member')));
    const built = await schema('merged').use(aclPlugin()).merge(first).merge(second).build();
    const result = await graphql({ schema: built, source: '{ one { secret } two { secret } }', contextValue: { role: 'member' } });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ one: { secret: 'one' }, two: { secret: 'two' } });
});
