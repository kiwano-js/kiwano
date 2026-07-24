import { expect, test } from 'vitest';

import { getDatabaseType, SearchFilterPluginHooks, SearchFullTextModifier } from '../src/ts';

function createInfo(databaseType: string) {

    return {
        options: {
            dataSource: {
                options: { type: databaseType }
            }
        }
    } as any;
}

function createQueryBuilderRecorder() {

    const calls: any[] = [];

    const queryBuilder = {
        calls,
        andWhere(clause: any, params?: any) {

            calls.push(recordCall('andWhere', clause, params));
            return this;
        },
        orWhere(clause: any, params?: any) {

            calls.push(recordCall('orWhere', clause, params));
            return this;
        },
        addOrderBy(clause: string, direction: string) {

            calls.push({ method: 'addOrderBy', clause, direction });
            return this;
        },
        setParameter(name: string, value: string) {

            calls.push({ method: 'setParameter', name, value });
            return this;
        }
    };

    return queryBuilder;
}

function recordCall(method: string, clause: any, params?: any) {

    if(clause?.whereFactory){

        const childQueryBuilder = createQueryBuilderRecorder();
        clause.whereFactory(childQueryBuilder);

        return {
            method,
            bracketed: childQueryBuilder.calls,
            params
        };
    }

    return { method, clause, params };
}

test('builds portable search as all natural-language terms across any configured field', (): void => {

    const hooks = new SearchFilterPluginHooks({ argumentName: 'search', typeFields: new Map() });
    const queryBuilder = createQueryBuilderRecorder();

    hooks.applySearch(
        queryBuilder as any,
        new Set([{ fields: ['title', 'description'] }]),
        'winter boots',
        { name: 'Product' } as any,
        createInfo('sqlite')
    );

    const fieldGroup = queryBuilder.calls[0].bracketed[0].bracketed;

    expect(fieldGroup).toHaveLength(2);
    expect(fieldGroup[0]).toEqual({
        method: 'andWhere',
        clause: "(LOWER(Product.title) LIKE LOWER(:searchQuery1_1) ESCAPE '\\\\' OR LOWER(Product.description) LIKE LOWER(:searchQuery1_1) ESCAPE '\\\\')",
        params: { searchQuery1_1: '%winter%' }
    });
    expect(fieldGroup[1].params).toEqual({ searchQuery1_2: '%boots%' });
});

test('limits portable search terms per field', (): void => {

    const hooks = new SearchFilterPluginHooks({ argumentName: 'search', typeFields: new Map() });
    const queryBuilder = createQueryBuilderRecorder();

    hooks.applySearch(
        queryBuilder as any,
        new Set([{ fields: ['title'], options: { maxSearchTerms: 2 } }]),
        'winter waterproof hiking boots',
        { name: 'Product' } as any,
        createInfo('sqlite')
    );

    const fieldGroup = queryBuilder.calls[0].bracketed[0].bracketed;

    expect(fieldGroup).toHaveLength(2);
    expect(fieldGroup[0].params).toEqual({ searchQuery1_1: '%winter%' });
    expect(fieldGroup[1].params).toEqual({ searchQuery1_2: '%waterproof%' });
});

test('uses mysql and mariadb full-text search when fullText is enabled', (): void => {

    const hooks = new SearchFilterPluginHooks({ argumentName: 'search', typeFields: new Map() });
    const queryBuilder = createQueryBuilderRecorder();

    hooks.applySearch(
        queryBuilder as any,
        new Set([{ fields: ['title', 'description'], options: { fullText: true, modifier: SearchFullTextModifier.BOOLEAN, sortRelevance: true } }]),
        'winter boots',
        { name: 'Product' } as any,
        createInfo('mariadb')
    );

    const fullTextCall = queryBuilder.calls[0].bracketed[0];

    expect(fullTextCall).toEqual({
        method: 'orWhere',
        clause: 'MATCH (Product.title, Product.description) AGAINST (:searchQueryFullText1 IN BOOLEAN MODE)',
        params: { searchQueryFullText1: '+winter +boots' }
    });
    expect(queryBuilder.calls).toContainEqual({
        method: 'addOrderBy',
        clause: 'MATCH (Product.title, Product.description) AGAINST (:searchQueryFullText1 IN BOOLEAN MODE)',
        direction: 'DESC'
    });
});

test('limits mysql boolean full-text terms per field', (): void => {

    const hooks = new SearchFilterPluginHooks({ argumentName: 'search', typeFields: new Map() });
    const queryBuilder = createQueryBuilderRecorder();

    hooks.applySearch(
        queryBuilder as any,
        new Set([{ fields: ['title'], options: { fullText: true, modifier: SearchFullTextModifier.BOOLEAN, maxSearchTerms: 2 } }]),
        'winter waterproof hiking boots',
        { name: 'Product' } as any,
        createInfo('mysql')
    );

    const fullTextCall = queryBuilder.calls[0].bracketed[0];

    expect(fullTextCall.params).toEqual({ searchQueryFullText1: '+winter +waterproof' });
});

test('uses postgres full-text search when fullText is enabled', (): void => {

    const hooks = new SearchFilterPluginHooks({ argumentName: 'search', typeFields: new Map() });
    const queryBuilder = createQueryBuilderRecorder();

    hooks.applySearch(
        queryBuilder as any,
        new Set([{ fields: ['title', 'description'], options: { fullText: true, sortRelevance: true } }]),
        'winter boots',
        { name: 'Product' } as any,
        createInfo('postgres')
    );

    const fullTextCall = queryBuilder.calls[0].bracketed[0];

    expect(fullTextCall.clause).toBe(
        "to_tsvector('simple', COALESCE(Product.title, '') || ' ' || COALESCE(Product.description, '')) @@ plainto_tsquery('simple', :searchQueryFullText1)"
    );
    expect(fullTextCall.params).toEqual({ searchQueryFullText1: 'winter boots' });
    expect(queryBuilder.calls[1].clause).toBe(
        "ts_rank_cd(to_tsvector('simple', COALESCE(Product.title, '') || ' ' || COALESCE(Product.description, '')), plainto_tsquery('simple', :searchQueryFullText1))"
    );
});

test('falls back to portable token search when fullText is enabled for an unsupported database', (): void => {

    const hooks = new SearchFilterPluginHooks({ argumentName: 'search', typeFields: new Map() });
    const queryBuilder = createQueryBuilderRecorder();

    hooks.applySearch(
        queryBuilder as any,
        new Set([{ fields: ['title'], options: { fullText: true } }]),
        'winter boots',
        { name: 'Product' } as any,
        createInfo('sqlite')
    );

    const fieldGroup = queryBuilder.calls[0].bracketed[0].bracketed;

    expect(fieldGroup[0].clause).toBe("(LOWER(Product.title) LIKE LOWER(:searchQuery1_1) ESCAPE '\\\\')");
    expect(fieldGroup[0].params).toEqual({ searchQuery1_1: '%winter%' });
    expect(fieldGroup[1].params).toEqual({ searchQuery1_2: '%boots%' });
});

test('gets the database type from a data source', (): void => {

    expect(getDatabaseType({ options: { type: 'postgres' } } as any)).toBe('postgres');
    expect(getDatabaseType({ driver: { options: { type: 'mariadb' } } } as any)).toBe('mariadb');
    expect(getDatabaseType({ driver: { type: 'sqlite' } } as any)).toBe('sqlite');
});
