import { graphql, type ExecutionResult, type GraphQLResolveInfo } from 'graphql';
import type { Path } from 'graphql/jsutils/Path';
import { describe, expect, test, vi, type Mock } from 'vitest';

import { AclAction, aclPlugin, field, objectType, schema, type AclOptions, type AclPlugin, type Middleware } from '../src/ts';

type Scope = 'Query' | 'Mutation' | 'Account';

interface AclFixture {
    acl: AclPlugin
    execute: (selection: string, contextValue?: unknown) => Promise<ExecutionResult>
    data: (values: Record<string, string | null>) => object
    paths: (key: string) => (string | number)[][]
    allowedResolver: Mock<() => string>
    protectedResolver: Mock<() => string>
    unlistedResolver: Mock<() => string>
}

async function createAclSchema(
    scope: Scope,
    options: AclOptions = {},
    configure?: (acl: AclPlugin) => void
): Promise<AclFixture> {

    const acl = aclPlugin(options)
        .role('member')
        .role('admin', 'member')
        .role('editor', 'member');

    configure?.(acl);

    const allowedResolver = vi.fn(() => 'public');
    const protectedResolver = vi.fn(() => 'secret');
    const unlistedResolver = vi.fn(() => 'unlisted');

    const fields = [
        field('viewer', 'String').allow('member').resolver(allowedResolver),
        field('allUsers', 'String').allow('admin').resolver(protectedResolver),
        field('unlisted', 'String').resolver(unlistedResolver)
    ];

    const builder = schema('acl-test')
        .query('health', 'String', value => value.resolver(() => 'ok'))
        .use(acl);

    if(scope === 'Account'){

        const account = objectType('Account');
        for(const value of fields){
            account.field(value);
        }

        builder.object(account)
            .query('accounts', '[Account]', value => value.allow('member').resolver(() => [{}, {}]));
    }
    else {

        for(const value of fields){

            if(scope === 'Mutation'){
                builder.mutation(value);
            }
            else {
                builder.query(value);
            }
        }
    }

    const builtSchema = await builder.build();

    function execute(selection: string, contextValue: unknown = { role: 'member' }): Promise<ExecutionResult> {

        let source = `{ ${selection} }`;
        if(scope === 'Mutation'){
            source = `mutation { ${selection} }`;
        }
        else if(scope === 'Account'){
            source = `{ accounts { ${selection} } }`;
        }

        return graphql({ schema: builtSchema, source, contextValue });
    }

    function data(values: Record<string, string | null>): object {

        return scope === 'Account' ? { accounts: [values, values] } : values;
    }

    function paths(key: string): (string | number)[][] {

        return scope === 'Account' ? [['accounts', 0, key], ['accounts', 1, key]] : [[key]];
    }

    return { acl, execute, data, paths, allowedResolver, protectedResolver, unlistedResolver };
}

describe.each<Scope>(['Query', 'Mutation', 'Account'])('GraphQL ACL for %s fields', scope => {

    test.each(['viewer', 'active: viewer'])('allows the schema field for selection %s', async (selection): Promise<void> => {

        const fixture = await createAclSchema(scope);
        const result = await fixture.execute(selection);
        const key = selection.includes(':') ? 'active' : 'viewer';

        expect(result.errors).toBeUndefined();
        expect(result.data).toEqual(fixture.data({ [key]: 'public' }));
        expect(fixture.allowedResolver).toHaveBeenCalledTimes(scope === 'Account' ? 2 : 1);
    });

    test.each(['allUsers', 'viewer: allUsers', 'active: allUsers'])(
        'denies the protected schema field for selection %s without executing its resolver',
        async (selection): Promise<void> => {

            const fixture = await createAclSchema(scope);
            const result = await fixture.execute(selection);
            const key = selection.includes(':') ? selection.split(':')[0] : 'allUsers';

            expect(result.data).toEqual(fixture.data({ [key]: null }));
            expect(result.errors?.map(error => error.message)).toEqual(
                fixture.paths(key).map(() => `No access to ${scope}.allUsers`)
            );
            expect(result.errors?.map(error => error.path)).toEqual(fixture.paths(key));
            expect(fixture.protectedResolver).not.toHaveBeenCalled();
        }
    );

    test('allows multiple aliases of the same field independently', async (): Promise<void> => {

        const fixture = await createAclSchema(scope);
        const validate = vi.spyOn(fixture.acl, 'validate');
        const result = await fixture.execute('first: viewer second: viewer');

        expect(result.errors).toBeUndefined();
        expect(result.data).toEqual(fixture.data({ first: 'public', second: 'public' }));
        expect(fixture.allowedResolver).toHaveBeenCalledTimes(scope === 'Account' ? 4 : 2);
        expect(validate.mock.calls.filter(([config]) => {
            return typeof config === 'object' && 'resource' in config && config.resource === `acl-test:${scope}.viewer`;
        })).toHaveLength(scope === 'Account' ? 4 : 2);
    });

    test('denies every alias of a protected field and preserves each error path', async (): Promise<void> => {

        const fixture = await createAclSchema(scope);
        const result = await fixture.execute('viewer: allUsers other: allUsers');

        expect(result.data).toEqual(fixture.data({ viewer: null, other: null }));
        expect(result.errors).toHaveLength(scope === 'Account' ? 4 : 2);
        expect(result.errors?.map(error => error.path)).toEqual(expect.arrayContaining([
            ...fixture.paths('viewer'), ...fixture.paths('other')
        ]));
        expect(fixture.protectedResolver).not.toHaveBeenCalled();
    });

    test('allows an administrator to access the protected field with an alias', async (): Promise<void> => {

        const fixture = await createAclSchema(scope);
        const result = await fixture.execute('viewer: allUsers', { role: 'admin' });

        expect(result.errors).toBeUndefined();
        expect(result.data).toEqual(fixture.data({ viewer: 'secret' }));
        expect(fixture.protectedResolver).toHaveBeenCalledTimes(scope === 'Account' ? 2 : 1);
    });

    test('preserves role inheritance for aliased fields', async (): Promise<void> => {

        const fixture = await createAclSchema(scope);
        const result = await fixture.execute('inherited: viewer', { role: 'editor' });

        expect(result.errors).toBeUndefined();
        expect(result.data).toEqual(fixture.data({ inherited: 'public' }));
    });

    test('preserves wildcard allows and more specific denies for aliased fields', async (): Promise<void> => {

        const fixture = await createAclSchema(scope, {}, acl => {
            acl.allow(`acl-test:${scope}.*`, 'member')
                .deny(`acl-test:${scope}.allUsers`, 'member');
        });
        const result = await fixture.execute('open: unlisted viewer: allUsers');

        expect(result.data).toEqual(fixture.data({ open: 'unlisted', viewer: null }));
        expect(result.errors?.map(error => error.path)).toEqual(fixture.paths('viewer'));
        expect(fixture.unlistedResolver).toHaveBeenCalledTimes(scope === 'Account' ? 2 : 1);
        expect(fixture.protectedResolver).not.toHaveBeenCalled();
    });

    test('preserves wildcard denies and more specific allows for aliased fields', async (): Promise<void> => {

        const fixture = await createAclSchema(scope, {}, acl => {
            acl.deny(`acl-test:${scope}.*`, 'member');
        });
        const result = await fixture.execute('open: viewer closed: unlisted');

        expect(result.data).toEqual(fixture.data({ open: 'public', closed: null }));
        expect(result.errors?.map(error => error.path)).toEqual(fixture.paths('closed'));
        expect(fixture.unlistedResolver).not.toHaveBeenCalled();
    });

    test('preserves deny precedence for equally specific rules and inherited roles', async (): Promise<void> => {

        const fixture = await createAclSchema(scope, {}, acl => {
            acl.deny(`acl-test:${scope}.allUsers`, 'member');
        });
        const result = await fixture.execute('viewer: allUsers', { role: 'admin' });

        expect(result.data).toEqual(fixture.data({ viewer: null }));
        expect(result.errors?.map(error => error.path)).toEqual(fixture.paths('viewer'));
        expect(fixture.protectedResolver).not.toHaveBeenCalled();
    });

    test.each([AclAction.DENY, AclAction.ALLOW])('preserves defaultAction %s for unconfigured fields', async (action): Promise<void> => {

        const fixture = await createAclSchema(scope, { defaultAction: action });
        const result = await fixture.execute('fallback: unlisted');

        if(action === AclAction.ALLOW){

            expect(result.errors).toBeUndefined();
            expect(result.data).toEqual(fixture.data({ fallback: 'unlisted' }));
        }
        else {

            expect(result.data).toEqual(fixture.data({ fallback: null }));
            expect(result.errors?.map(error => error.path)).toEqual(fixture.paths('fallback'));
            expect(fixture.unlistedResolver).not.toHaveBeenCalled();
        }
    });

    test('preserves a custom rolePath and onForbidden with the schema field identity', async (): Promise<void> => {

        const onForbidden = vi.fn((resource: string): void => {
            throw new Error(`Custom denial: ${resource}`);
        });
        const fixture = await createAclSchema(scope, {}, acl => {
            acl.rolePath('session.user.role').onForbidden(onForbidden);
        });
        const result = await fixture.execute('open: viewer viewer: allUsers', {
            role: 'admin', session: { user: { role: 'member' } }
        });

        expect(result.data).toEqual(fixture.data({ open: 'public', viewer: null }));
        expect(result.errors?.map(error => error.message)).toEqual(
            fixture.paths('viewer').map(() => `Custom denial: ${scope}.allUsers`)
        );
        expect(result.errors?.map(error => error.path)).toEqual(fixture.paths('viewer'));
        expect(onForbidden).toHaveBeenCalledTimes(scope === 'Account' ? 2 : 1);
        expect(onForbidden).toHaveBeenCalledWith(`${scope}.allUsers`);
        expect(fixture.protectedResolver).not.toHaveBeenCalled();
    });
});

test('passes the original resolver info and response alias through the ACL middleware', async (): Promise<void> => {

    const observations: { info: GraphQLResolveInfo, path: Path }[] = [];
    const observer: Middleware = (resolve, root, args, context, info) => {

        observations.push({ info, path: info.path });
        Object.freeze(info.path);
        Object.freeze(info);

        return resolve(root, args, context, info);
    };
    const resolver = vi.fn((_root: unknown, _args: unknown, _context: unknown, info: GraphQLResolveInfo): string => {

        const observation = observations.find(value => value.info === info);

        expect(observation).toBeDefined();
        expect(info.path).toBe(observation?.path);
        expect(info.fieldName).toBe('viewer');
        expect(info.path.key).toBe('active');

        return 'public';
    });
    const builtSchema = await schema('acl-test')
        .query('viewer', 'String', value => value.allow('member').resolver(resolver))
        .use(observer)
        .use(aclPlugin())
        .build();
    const result = await graphql({ schema: builtSchema, source: '{ active: viewer }', contextValue: { role: 'member' } });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ active: 'public' });
    expect(resolver).toHaveBeenCalledOnce();
});

test('preserves parent aliases and list indices in nested responses and error paths', async (): Promise<void> => {

    const protectedResolver = vi.fn(() => 'secret');
    const builtSchema = await schema('acl-test')
        .query('accounts', '[Account]', value => value.allow('member').resolver(() => [{}, {}]))
        .object('Account', account => account
            .field('viewer', 'String', value => value.allow('member').resolver(() => 'public'))
            .field('allUsers', 'String', value => value.allow('admin').resolver(protectedResolver)))
        .use(aclPlugin())
        .build();
    const result = await graphql({
        schema: builtSchema,
        source: '{ rows: accounts { active: viewer viewer: allUsers } }',
        contextValue: { role: 'member' }
    });

    expect(result.data).toEqual({ rows: [
        { active: 'public', viewer: null },
        { active: 'public', viewer: null }
    ] });
    expect(result.errors?.map(error => error.path)).toEqual([['rows', 0, 'viewer'], ['rows', 1, 'viewer']]);
    expect(result.errors?.map(error => error.message)).toEqual([
        'No access to Account.allUsers', 'No access to Account.allUsers'
    ]);
    expect(protectedResolver).not.toHaveBeenCalled();
});

test('keeps ACL rules isolated by the schema prefix', async (): Promise<void> => {

    const acl = aclPlugin().allow('first:Query.viewer', 'member');
    const resolver = vi.fn(() => 'secret');
    const builtSchema = await schema('second')
        .query('viewer', 'String', value => value.resolver(resolver))
        .use(acl)
        .build();
    const result = await graphql({ schema: builtSchema, source: '{ viewer }', contextValue: { role: 'member' } });

    expect(result.data).toEqual({ viewer: null });
    expect(result.errors?.[0].message).toBe('No access to Query.viewer');
    expect(resolver).not.toHaveBeenCalled();
});

