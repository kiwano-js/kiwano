import { graphql } from 'graphql';
import { expect, test } from 'vitest';

import { aclPlugin, AclAction, schema } from '../src/ts';

test.each([null, undefined, 'unknown'])('ALLOW does not authorize missing or unregistered role %s', role => {

    const acl = aclPlugin({ defaultAction: AclAction.ALLOW }).role('admin');
    expect(acl.validate('admin', role)).toBe(false);
    expect(acl.validate({ resource: 'secret' }, role)).toBe(false);
    expect(acl.isAllowed(role, 'secret')).toBe(false);
});

test('role zero is checked for both grants and denies', () => {

    const acl = aclPlugin({ defaultAction: AclAction.ALLOW }).role(0).deny('secret', 0);
    expect(acl.validate({ resource: 'secret' }, 0)).toBe(false);
    expect(acl.validate([0], 0)).toBe(true);
    expect(acl.validate(['admin'], 0)).toBe(false);
});

test('inherits deny rules from numeric role zero and empty-string parents', () => {

    const acl = aclPlugin({ defaultAction: AclAction.ALLOW })
        .role(0).role(1, 0).deny('numeric', 0)
        .role('').role('child', '').deny('text', '');

    expect(acl.validate({ resource: 'numeric' }, 1)).toBe(false);
    expect(acl.validate({ resource: 'text' }, 'child')).toBe(false);
});

test('anonymous GraphQL contexts cannot bypass a deny with ALLOW configured', async () => {

    const built = await schema('role-validation').use(aclPlugin({ defaultAction: AclAction.ALLOW }))
        .query('secret', 'String', field => field.deny('member').resolver(() => 'secret'))
        .build();
    const result = await graphql({ schema: built, source: '{ secret }', contextValue: {} });

    expect(result.data?.secret).toBeNull();
    expect(result.errors?.[0].message).toBe('No access to Query.secret');
});

test('registered roles retain ALLOW fallback and explicit allow-list checks', () => {

    const acl = aclPlugin({ defaultAction: AclAction.ALLOW }).role('member').role('admin');
    expect(acl.validate({ resource: 'unlisted' }, 'member')).toBe(true);
    expect(acl.validate('admin', 'member')).toBe(false);
    expect(acl.validate('admin', 'admin')).toBe(true);
    expect(acl.validate(null, 'member')).toBe(true);
});
