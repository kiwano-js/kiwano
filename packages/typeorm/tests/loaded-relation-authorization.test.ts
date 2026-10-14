import { graphql } from 'graphql';
import { expect, test, vi } from 'vitest';
import { EntityFieldType, entityFieldTypeExtensionName, schema } from '@kiwano/core';

import { ModelEntityResolvers, resolverOptionsExtensionName } from '../src/ts';

async function fixture(allowed: boolean, secrets: unknown) {

    const authorize = vi.fn(() => allowed);
    const fetch = vi.fn(() => [{ id: 'scoped' }]);

    class EntityResolvers extends ModelEntityResolvers<any> {

        $relationAllowed() {

            return authorize();
        }

        $fetchRelation() {

            return fetch();
        }
    }

    const dataSource = {
        getRepository: () => ({
            metadata: {
                name: 'Account',
                findRelationWithPropertyPath: () => ({ isOneToMany: true })
            }
        })
    };
    const built = await schema('loaded-relations')
        .query('account', 'Account', field => field.resolver(() => ({ secrets, name: 'account' })))
        .object('Account', object => object
            .field('name', 'String')
            .field('secrets', '[Secret]', field => field
                .extension(entityFieldTypeExtensionName, EntityFieldType.RELATION)
                .extension(resolverOptionsExtensionName, {
                    dataSource, model: 'Account', relation: 'secrets', fieldInfo: { includeDeleted: false }
                })))
        .object('Secret', object => object.field('id', 'ID'))
        .resolvers({ Account: new EntityResolvers() })
        .build();

    return { built, authorize, fetch };
}

test.each([[], [{ id: 'private' }]])('preloaded relations still run access hooks for %j', async value => {

    const { built, authorize } = await fixture(false, value);
    const result = await graphql({ schema: built, source: '{ account { name secrets { id } } }' });

    expect(result.data?.account).toEqual({ name: 'account', secrets: null });
    expect(result.errors?.[0].message).toContain('No access to relation');
    expect(authorize).toHaveBeenCalledOnce();
});

test('loaded values cannot replace the scoped authorized result', async () => {

    const { built, authorize, fetch } = await fixture(true, [{ id: 'private' }]);
    const result = await graphql({ schema: built, source: '{ account { secrets { id } } }' });

    expect(result.errors).toBeUndefined();
    expect(result.data?.account).toEqual({ secrets: [{ id: 'scoped' }] });
    expect(authorize).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledOnce();
});

test('unloaded relations retain the same authorization path', async () => {

    const { built, authorize } = await fixture(false, undefined);
    const result = await graphql({ schema: built, source: '{ account { secrets { id } } }' });

    expect(result.errors?.[0].message).toContain('No access to relation');
    expect(authorize).toHaveBeenCalledOnce();
});
