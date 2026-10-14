import { graphql } from 'graphql';
import { expect, test, vi } from 'vitest';

import { aclPlugin, entitySchema, schema } from '../src/ts';

test.each(['create', 'update'])('generated %s input blocks protected writes before the resolver', async (operation): Promise<void> => {

    const save = vi.fn((source, args) => ({ id: '1', isAdmin: args.input.isAdmin }));
    const builder = entitySchema('User').use(aclPlugin({ onForbidden: (): void => {} }).role('member').role('admin'))
        .entity('User', object => object
            .field('id', 'ID', field => field.allow('member', 'admin'))
            .field('isAdmin', 'Boolean', field => field.allow('admin').deny('member')))
        .query('health', 'String', field => field.allow('member', 'admin').resolver(() => 'ok'));

    if(operation === 'create'){

        builder.create('save', field => field.allow('member', 'admin').resolver(save));
    }
    else {

        builder.update('save', field => field.allow('member', 'admin').resolver(save));
    }

    const built = await builder.build();
    const input = operation === 'create' ? 'isAdmin: true' : 'id: "1", isAdmin: true';
    const source = `mutation { save(input: { ${input} }) { id } }`;
    const member = await graphql({ schema: built, source, contextValue: { role: 'member' } });

    expect(member.errors?.[0].message).toContain('isAdmin');
    expect(save).not.toHaveBeenCalled();

    const admin = await graphql({ schema: built, source, contextValue: { role: 'admin' } });
    expect(admin.errors).toBeUndefined();
    expect(save).toHaveBeenCalledOnce();
    expect(save.mock.calls[0][1].input.isAdmin).toBe(true);
});

test('explicit input policies can separate write access from output read access', async (): Promise<void> => {

    const save = vi.fn(() => ({ id: '1', isAdmin: true }));
    const built = await entitySchema('User')
        .use(aclPlugin().role('member').role('writer').role('admin'))
        .entity('User', object => object
            .field('id', 'ID', field => field.allow('member', 'writer'))
            .field('isAdmin', 'Boolean', field => field.allow('admin')))
        .createInput(input => input.field('isAdmin', 'Boolean', field => field.allow('writer')))
        .create('save', field => field.allow('member', 'writer').resolver(save))
        .query('health', 'String', field => field.allow('member').resolver(() => 'ok'))
        .build();
    const source = 'mutation { save(input: { isAdmin: true }) { id } }';

    const denied = await graphql({ schema: built, source, contextValue: { role: 'member' } });
    expect(denied.errors?.[0].message).toContain('isAdmin');
    expect(save).not.toHaveBeenCalled();

    const allowed = await graphql({ schema: built, source, contextValue: { role: 'writer' } });
    expect(allowed.errors).toBeUndefined();
    expect(save).toHaveBeenCalledOnce();
});

test('checks provided nested list keys including null values, without blocking omitted protected keys', async (): Promise<void> => {

    const save = vi.fn(() => true);
    const built = await schema('nested-inputs')
        .use(aclPlugin().role('member').role('writer', 'member'))
        .inputObject('Details', input => input
            .field('public', 'String')
            .field('secret', 'String', field => field.allow('writer')))
        .inputObject('Input', input => input.field('details', '[Details]'))
        .query('health', 'String', field => field.allow('member').resolver(() => 'ok'))
        .mutation('save', 'Boolean', field => field.allow('member').arg('input', 'Input').resolver(save))
        .build();

    const omitted = await graphql({ schema: built, source: 'mutation { save(input: { details: [{ public: "ok" }] }) }', contextValue: { role: 'member' } });
    expect(omitted.errors).toBeUndefined();
    save.mockClear();

    const denied = await graphql({ schema: built, source: 'mutation { save(input: { details: [{ secret: null }] }) }', contextValue: { role: 'member' } });
    expect(denied.errors?.[0].message).toContain('Details.secret');
    expect(save).not.toHaveBeenCalled();

    const allowed = await graphql({ schema: built, source: 'mutation { save(input: { details: [{ secret: "ok" }] }) }', contextValue: { role: 'writer' } });
    expect(allowed.errors).toBeUndefined();
    expect(save).toHaveBeenCalledOnce();
});
