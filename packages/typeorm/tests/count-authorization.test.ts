import { expect, test, vi } from 'vitest';

import { allResolver, itemsPaginationPlugin, relationResolver, validateCountAccess } from '../src/ts';

function selection(name: string): any {

    return {
        fieldNodes: [{ selectionSet: { selections: [{ kind: 'Field', name: { value: name } }] } }],
        fragments: {}
    };
}

function fixture(hooks: any = {}) : { resolver: ReturnType<typeof allResolver>; fetch: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> } {

    const fetch = vi.fn(async () => [{ id: 'foreign', tenant: 'other' }]);
    const count = vi.fn(async () => 1);
    const dataSource: any = {
        getRepository: () => ({
            metadata: { name: 'Record' },
            createQueryBuilder: () => ({ getMany: fetch, getCount: count })
        })
    };
    const resolver = allResolver({
        dataSource, model: 'Record', fieldInfo: { includeDeleted: false } as any,
        plugins: [itemsPaginationPlugin()]
    }, hooks);

    return { resolver, fetch, count };
}

test('row-dependent approval of an empty array cannot authorize a count-only request', async (): Promise<void> => {

    const allAllowed = vi.fn((rows, info) => rows.every(row => row.tenant === info.context.tenant));
    const { resolver, fetch, count } = fixture({ $allAllowed: allAllowed });
    const context = { tenant: 'own' };
    const result = await resolver(null, {}, context, selection('totalCount')) as any;

    await expect(result.totalCount()).rejects.toThrow('No access to total count');
    expect(allAllowed).toHaveBeenCalledWith([], expect.anything());
    expect(fetch).not.toHaveBeenCalled();
    expect(count).not.toHaveBeenCalled();

    await expect(resolver(null, {}, context, selection('items'))).rejects.toThrow('No access');
});

test('preserves the optimized count query when no row-based guard is configured', async (): Promise<void> => {

    const { resolver, fetch, count } = fixture();
    const result = await resolver(null, {}, {}, selection('totalCount')) as any;

    expect(await result.totalCount()).toBe(1);
    expect(fetch).not.toHaveBeenCalled();
    expect(count).toHaveBeenCalledOnce();
});

test('count permissions can be granted separately without fetching rows', async (): Promise<void> => {

    const { resolver, fetch, count } = fixture({
        $allAllowed: rows => rows.every(row => row.tenant === 'own'),
        $countAllowed: info => info.context.role === 'admin'
    });
    const denied = await resolver(null, {}, { role: 'member' }, selection('totalCount')) as any;
    await expect(denied.totalCount()).rejects.toThrow('No access to total count');

    const allowed = await resolver(null, {}, { role: 'admin' }, selection('totalCount')) as any;
    expect(await allowed.totalCount()).toBe(1);
    expect(fetch).not.toHaveBeenCalled();
    expect(count).toHaveBeenCalledOnce();
});

test('count hooks must explicitly return true and a denying plugin wins', async (): Promise<void> => {

    await expect(validateCountAccess([{ $countAllowed: async () => undefined }], '$allAllowed', {} as any))
        .rejects.toThrow('No access to total count');
    await expect(validateCountAccess([{ $countAllowed: () => true }, { $countAllowed: () => false }], '$allAllowed', {} as any))
        .rejects.toThrow('No access to total count');
});

test('relation counts cannot bypass a row-dependent relation policy', async (): Promise<void> => {

    const dataSource: any = {
        getRepository: () => ({
            metadata: {
                name: 'Account',
                findRelationWithPropertyPath: () => ({ isOneToMany: true })
            }
        })
    };
    const resolver = relationResolver({
        dataSource, model: 'Account', relation: 'records',
        fieldInfo: { includeDeleted: false } as any, plugins: [itemsPaginationPlugin()]
    }, {
        $fetchRelation: () => [{ id: 'own' }],
        $relationAllowed: () => true
    });
    const result = await resolver({}, {}, {}, selection('totalCount')) as any;

    await expect(result.totalCount()).rejects.toThrow('No access to total count');
});
