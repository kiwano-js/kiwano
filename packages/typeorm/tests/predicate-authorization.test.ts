import { graphql } from 'graphql';
import { expect, test, vi } from 'vitest';
import { aclPlugin, schema } from '@kiwano/core';

import { allResolver, equalsFilterPlugin, searchFilterPlugin, sortPlugin } from '../src/ts';

async function fixture(kind: 'filter' | 'sort' | 'search', explicitSearch = false) : Promise<{ built: import('graphql').GraphQLSchema; fetch: ReturnType<typeof vi.fn>; clauses: string[] }> {

    const clauses: string[] = [];
    const fetch = vi.fn(async () => [{ id: '1', name: 'public', secret: 'private' }]);
    const queryBuilder: any = {
        getMany: fetch,
        andWhere(clause: any) : any {

            if(clause.whereFactory){
                clause.whereFactory(queryBuilder);
            }
            else {
                clauses.push(clause);
            }

            return queryBuilder;
        },
        orWhere(clause: any) : any {

            return queryBuilder.andWhere(clause);
        },
        addOrderBy(clause: string) : any {

            clauses.push(clause);
            return queryBuilder;
        }
    };
    const metadata = { name: 'Account' };
    const dataSource: any = {
        options: { type: 'sqlite' },
        getRepository: () => ({ metadata, createQueryBuilder: (): any => queryBuilder }),
        getMetadata: () => metadata
    };
    const plugin = kind === 'filter' ? equalsFilterPlugin()
        : kind === 'sort' ? sortPlugin()
        : explicitSearch ? searchFilterPlugin().field('secret') : searchFilterPlugin();
    const resolver = allResolver({
        dataSource, model: 'Account', plugins: [plugin], fieldInfo: { includeDeleted: false, type: 'Account', extensions: new Map() } as any
    });
    const built = await schema('predicates').use(aclPlugin().role('member').role('admin'))
        .object('Account', object => object
            .field('id', 'ID', field => field.allow('member', 'admin'))
            .field('name', 'String', field => field.allow('member', 'admin'))
            .field('secret', 'String', field => field.allow('admin')))
        .query('accounts', '[Account]', field => field.allow('member', 'admin').use(plugin).resolver(resolver))
        .build();

    return { built, fetch, clauses };
}

test.each(['filter', 'sort'] as const)('blocks hidden %s predicates before database execution and permits admin', async (kind): Promise<void> => {

    const { built, fetch } = await fixture(kind);
    const argument = kind === 'filter' ? 'filter: { secret: "guess" }' : 'sort: { field: secret, direction: ASC }';
    const source = `{ accounts(${argument}) { id } }`;
    const denied = await graphql({ schema: built, source, contextValue: { role: 'member' } });

    expect(denied.errors?.[0].message).toContain('No access to predicate');
    expect(fetch).not.toHaveBeenCalled();

    const allowed = await graphql({ schema: built, source, contextValue: { role: 'admin' } });
    expect(allowed.errors).toBeUndefined();
    expect(fetch).toHaveBeenCalledOnce();
});

test('automatic search uses only readable fields without revealing protected values', async (): Promise<void> => {

    const { built, clauses } = await fixture('search');
    const result = await graphql({
        schema: built, source: '{ accounts(search: "private") { id } }', contextValue: { role: 'member' }
    });

    expect(result.errors).toBeUndefined();
    expect(clauses.join(' ')).toContain('Account.name');
    expect(clauses.join(' ')).not.toContain('Account.secret');
});

test('explicit search on a hidden field is rejected rather than silently opening the query', async (): Promise<void> => {

    const { built, fetch } = await fixture('search', true);
    const result = await graphql({
        schema: built, source: '{ accounts(search: "private") { id } }', contextValue: { role: 'member' }
    });

    expect(result.errors?.[0].message).toContain('No access to configured search predicate');
    expect(fetch).not.toHaveBeenCalled();
});
