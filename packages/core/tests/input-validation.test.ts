import { graphql, parse, printType, subscribe, type ExecutionResult, type GraphQLInputObjectType, type GraphQLSchema } from 'graphql';
import { expect, test, vi, type Mock } from 'vitest';

import { entitySchema, InvalidInputError, rejectNullExtensionName, schema } from '../src/ts';

type CustomerInput = { id: string };

async function createCustomerSchema(): Promise<{
    builtSchema: GraphQLSchema
    update: Mock<(input: CustomerInput) => CustomerInput>
}> {

    const update = vi.fn((input: CustomerInput): CustomerInput => ({ id: input.id }));

    class MutationResolvers {
        prefix = 'customer';

        updateCustomer(_source: unknown, args: { input: CustomerInput }): CustomerInput {

            expect(this.prefix).toBe('customer');
            return update(args.input);
        }
    }

    const builtSchema = await entitySchema('Customer')
        .entity(value => value
            .field('id', 'ID!')
            .field('name', 'String!')
            .field('contactId', 'ID')
            .field('tags', '[String!]!'))
        .query('health', 'String')
        .create()
        .update()
        .mutationResolvers(MutationResolvers)
        .build();

    return { builtSchema, update };
}

test.each(['literal', 'variable'])('validates generated update inputs supplied as a %s', async (mode): Promise<void> => {

    const { builtSchema, update } = await createCustomerSchema();
    const cases = [
        { input: { id: '1' }, literal: '{ id: "1" }' },
        { input: { id: '1', name: 'Acme' }, literal: '{ id: "1", name: "Acme" }' },
        { input: { id: '1', contactId: null }, literal: '{ id: "1", contactId: null }' },
        { input: { id: '1', tags: [] }, literal: '{ id: "1", tags: [] }' },
        { input: { id: '1', name: null }, literal: '{ id: "1", name: null }', rejected: 'name' },
        { input: { id: '1', tags: null }, literal: '{ id: "1", tags: null }', rejected: 'tags' }
    ];

    for(const value of cases){

        update.mockClear();

        const result = await graphql({
            schema: builtSchema,
            source: mode === 'literal'
                ? `mutation { changed: updateCustomer(input: ${value.literal}) { id } }`
                : 'mutation($input: UpdateCustomerInput!) { changed: updateCustomer(input: $input) { id } }',
            variableValues: { input: value.input }
        });

        if(value.rejected){

            expect(update).not.toHaveBeenCalled();
            expect(result.errors?.[0].message).toBe(`Input field "input.${value.rejected}" must not be null`);
            expect(result.errors?.[0].path).toEqual(['changed']);
            expect(result.errors?.[0].originalError).toBeInstanceOf(InvalidInputError);
        }
        else {

            expect(result.errors).toBeUndefined();
            expect(update).toHaveBeenCalledExactlyOnceWith(value.input);
        }
    }
});

test('preserves native required fields, create inputs and non-null list items', async (): Promise<void> => {

    const { builtSchema, update } = await createCustomerSchema();

    expect(printType(builtSchema.getType('CreateCustomerInput') as GraphQLInputObjectType)).toContain('name: String!');
    expect(printType(builtSchema.getType('UpdateCustomerInput') as GraphQLInputObjectType)).toContain('name: String\n');

    for(const input of [{ name: 'Acme' }, { id: '1', tags: [null] }]){

        const result = await graphql({
            schema: builtSchema,
            source: 'mutation($input: UpdateCustomerInput!) { updateCustomer(input: $input) { id } }',
            variableValues: { input }
        });

        expect(result.errors).toHaveLength(1);
        expect(update).not.toHaveBeenCalled();
    }
});

test('respects manual update fields and allows rejectNull to be disabled', async (): Promise<void> => {

    const update = vi.fn(() => ({ id: '1' }));
    const builtSchema = await entitySchema('Customer')
        .entity(value => value.field('id', 'ID!').field('name', 'String!'))
        .query('health', 'String')
        .update()
        .updateInput(value => value.field('name', 'String', field => field.rejectNull().rejectNull(false)))
        .mutationResolvers({ updateCustomer: update })
        .build();
    const result = await graphql({
        schema: builtSchema,
        source: 'mutation { updateCustomer(input: { id: "1", name: null }) { id } }'
    });

    expect(result.errors).toBeUndefined();
    expect(update).toHaveBeenCalledOnce();
});

test('validates recursive input objects and lists on nested output fields', async (): Promise<void> => {

    const inspect = vi.fn(() => 'ok');
    const builtSchema = await schema()
        .inputObject('NodeInput', value => value
            .field('children', '[NodeInput]')
            .field('name', 'String', field => field.rejectNull()))
        .object('Viewer', value => value.field('inspect', 'String', field => field.arg('nodes', '[NodeInput!]').resolver(inspect)))
        .query('viewer', 'Viewer', field => field.resolver(() => ({})))
        .build();
    const result = await graphql({
        schema: builtSchema,
        source: 'query($nodes: [NodeInput!]) { me: viewer { result: inspect(nodes: $nodes) } }',
        variableValues: { nodes: [{ children: [null, { name: null }] }] }
    });

    expect(inspect).not.toHaveBeenCalled();
    expect(result.errors?.[0].message).toBe('Input field "nodes[0].children[1].name" must not be null');
    expect(result.errors?.[0].path).toEqual(['me', 'result']);

    const valid = await graphql({
        schema: builtSchema,
        source: '{ viewer { inspect(nodes: { children: [null, { name: "Acme" }] }) } }'
    });

    expect(valid.errors).toBeUndefined();
    expect(inspect).toHaveBeenCalledOnce();
});

test('preserves omitted variables, defaults, nullable objects and scalar values', async (): Promise<void> => {

    const inspect = vi.fn((_source, args): string => JSON.stringify(args));
    const builtSchema = await schema()
        .inputObject('Input', value => value
            .field('name', 'String', field => field.rejectNull())
            .field('enabled', 'Boolean', field => field.rejectNull())
            .field('count', 'Int', field => field.rejectNull()))
        .query('inspect', 'String', field => field.arg('input', 'Input').resolver(inspect))
        .build();

    for(const [source, expected] of [
        ['query($name: String) { inspect(input: {name: $name}) }', { input: {} }],
        ['query($name: String = "default") { inspect(input: {name: $name}) }', { input: { name: 'default' } }],
        ['{ inspect(input: null) }', { input: null }],
        ['{ inspect(input: {name: "", enabled: false, count: 0}) }', { input: { name: '', enabled: false, count: 0 } }]
    ] as const){

        const result = await graphql({ schema: builtSchema, source });

        expect(result.errors).toBeUndefined();
        expect(result.data?.inspect).toBe(JSON.stringify(expected));
    }

    const invalidDefault = await graphql({
        schema: builtSchema,
        source: 'query($name: String = null) { inspect(input: {name: $name}) }'
    });

    expect(invalidDefault.errors?.[0].message).toBe('Input field "input.name" must not be null');
    expect(inspect).toHaveBeenCalledTimes(4);
});

test('protects default resolvers and inputs inherited from merged schemas', async (): Promise<void> => {

    const inspect = vi.fn(function(this: { prefix: string }, input: unknown): string {

        return `${this.prefix}:${JSON.stringify(input)}`;
    });
    const child = schema()
        .inputObject('Input', value => value.field('name', 'String', field => field.rejectNull()))
        .query('inspect', 'String', field => field.arg('input', 'Input'));
    const builtSchema = await schema().merge(child).build();
    const rootValue = { prefix: 'root', inspect };
    const invalid = await graphql({ schema: builtSchema, source: '{ inspect(input: {name: null}) }', rootValue });

    expect(invalid.errors?.[0].message).toBe('Input field "input.name" must not be null');
    expect(inspect).not.toHaveBeenCalled();

    const valid = await graphql({ schema: builtSchema, source: '{ inspect(input: {name: "Acme"}) }', rootValue });

    expect(valid.errors).toBeUndefined();
    expect(valid.data?.inspect).toBe('root:{"input":{"name":"Acme"}}');
});

test('wraps final plugin resolvers while leaving unrelated resolvers untouched', async (): Promise<void> => {

    const inspect = vi.fn(() => 'ok');
    const health = vi.fn(() => 'healthy');
    let originalHealth: unknown;
    const builtSchema = await schema()
        .inputObject('Input', value => value.field('name', 'String', field => field.rejectNull()))
        .query('inspect', 'String', field => field.arg('input', 'Input'))
        .query('health', 'String', field => field.resolver(health))
        .use({
            afterBuild(_builder, built: GraphQLSchema): void {

                const fields = built.getQueryType()?.getFields();
                fields.inspect.resolve = inspect;
                originalHealth = fields.health.resolve;
            }
        })
        .build();
    const result = await graphql({ schema: builtSchema, source: '{ inspect(input: {name: null}) health }' });

    expect(result.errors).toHaveLength(1);
    expect(inspect).not.toHaveBeenCalled();
    expect(result.data?.health).toBe('healthy');
    expect(builtSchema.getQueryType()?.getFields().health.resolve).toBe(originalHealth);
});

test('exposes rejectNull metadata without changing the GraphQL field type', async (): Promise<void> => {

    const builder = schema()
        .inputObject('Input', value => value.field('name', 'String', field => field.rejectNull()))
        .query('inspect', 'String', field => field.arg('input', 'Input'));
    const builtSchema = await builder.build();
    const input = builtSchema.getQueryType()?.getFields().inspect.args[0].type as GraphQLInputObjectType;

    expect(printType(input)).toContain('name: String\n');
    expect(input.getFields().name.extensions[rejectNullExtensionName]).toBe(true);
});

test('rejects invalid subscription inputs before opening a stream', async (): Promise<void> => {

    const openStream = vi.fn(async function*(): AsyncGenerator<string> {

        yield 'event';
    });
    const builtSchema = await schema()
        .query('health', 'String')
        .inputObject('Input', value => value.field('name', 'String', field => field.rejectNull()))
        .subscription('updates', 'String', field => field.arg('input', 'Input'))
        .subscriptionResolvers({ updates: { subscribe: openStream, resolve: (payload: string): string => payload } })
        .build();
    const invalid = await subscribe({
        schema: builtSchema,
        document: parse('subscription { updates(input: {name: null}) }')
    }) as ExecutionResult;

    expect(invalid.errors?.[0].message).toBe('Input field "input.name" must not be null');
    expect(openStream).not.toHaveBeenCalled();

    const valid = await subscribe({
        schema: builtSchema,
        document: parse('subscription { updates(input: {}) }')
    }) as AsyncIterableIterator<ExecutionResult>;

    expect((await valid.next()).value.data).toEqual({ updates: 'event' });
    expect(openStream).toHaveBeenCalledOnce();
    await valid.return?.();
});
