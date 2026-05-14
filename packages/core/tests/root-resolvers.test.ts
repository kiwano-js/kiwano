import { expect, test } from 'vitest';

import { schema } from '../src/ts';

import { buildRootField, getRootFieldInfo } from './helpers';

test('supports class-based query resolvers as used by the backend schema', async (): Promise<void> => {

    class QueryResolvers {
        prefix = 'query';

        viewer() {
            return `${this.prefix}:viewer`;
        }
    }

    const builder = schema()
        .query('viewer', 'String')
        .queryResolvers(QueryResolvers)
        .allowQuery('admin');

    await builder.finalize();

    expect((builder.compiledResolvers as any).Query).toBeInstanceOf(QueryResolvers);

    const queryField = buildRootField(builder, 'Query', 'viewer');
    const fieldInfo = getRootFieldInfo(builder, 'Query', 'viewer');

    expect(queryField.resolve?.()).toBe('query:viewer');
    expect(fieldInfo.allowedRoles.has('admin')).toBe(true);
});

test('supports class-based mutation resolvers and keeps mutation arguments intact', async (): Promise<void> => {

    class MutationResolvers {
        prefix = 'mutation';

        updateAccount() {
            return `${this.prefix}:updateAccount`;
        }
    }

    const builder = schema()
        .query('health', 'String')
        .mutation('updateAccount', 'String', _ => _.arg('input', 'String!'))
        .mutationResolvers(MutationResolvers)
        .allowMutation('editor');

    await builder.finalize();

    expect((builder.compiledResolvers as any).Mutation).toBeInstanceOf(MutationResolvers);

    const mutationField = buildRootField(builder, 'Mutation', 'updateAccount');
    const fieldInfo = getRootFieldInfo(builder, 'Mutation', 'updateAccount');

    expect(mutationField.resolve?.()).toBe('mutation:updateAccount');
    expect(fieldInfo.arguments[0].name).toBe('input');
    expect(fieldInfo.allowedRoles.has('editor')).toBe(true);
});

test('supports resolver instances for query and mutation roots', async (): Promise<void> => {

    const queryResolvers = {
        prefix: 'query-instance',
        viewer() {
            return `${this.prefix}:viewer`;
        }
    };

    const mutationResolvers = {
        prefix: 'mutation-instance',
        updateAccount() {
            return `${this.prefix}:updateAccount`;
        }
    };

    const builder = schema()
        .query('viewer', 'String')
        .mutation('updateAccount', 'String')
        .queryResolvers(queryResolvers)
        .mutationResolvers(mutationResolvers);

    await builder.finalize();

    expect((builder.compiledResolvers as any).Query).toBe(queryResolvers);
    expect((builder.compiledResolvers as any).Mutation).toBe(mutationResolvers);
    expect(buildRootField(builder, 'Query', 'viewer').resolve?.()).toBe('query-instance:viewer');
    expect(buildRootField(builder, 'Mutation', 'updateAccount').resolve?.()).toBe('mutation-instance:updateAccount');
});