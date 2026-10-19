import { graphql } from 'graphql';
import { expect, test, vi } from 'vitest';

import { applyMiddleware, schema, type Middleware } from '../src/ts';

test('preserves middleware order, default forwarding and argument overrides', async (): Promise<void> => {

    const order: string[] = [];
    const rootValue = { prefix: 'root' };
    const contextValue = { suffix: '!' };
    const resolver = vi.fn((source, args, context): string => {

        order.push('resolver');
        expect(source).toBe(rootValue);
        expect(context).toBe(contextValue);
        return `${source.prefix}:${args.name}${context.suffix}`;
    });
    const first: Middleware = async (next) => {

        order.push('first:before');
        const result = await next();
        order.push('first:after');

        return `[${result}]`;
    };
    const second: Middleware = async (next, _source, args) => {

        order.push('second:before');
        const result = await next(undefined, { ...args, name: 'changed' });
        order.push('second:after');

        return result.toUpperCase();
    };
    const builtSchema = await schema()
        .query('greet', 'String', field => field.arg('name', 'String').resolver(resolver))
        .use(first, second)
        .build();
    const result = await graphql({ schema: builtSchema, source: '{ greet(name: "original") }', rootValue, contextValue });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ greet: '[ROOT:CHANGED!]' });
    expect(order).toEqual(['first:before', 'second:before', 'resolver', 'second:after', 'first:after']);
    expect(resolver).toHaveBeenCalledOnce();
});

test('allows middleware to return a result without calling the resolver', async (): Promise<void> => {

    const resolver = vi.fn(() => 'unexpected');
    const builtSchema = await schema()
        .query('value', 'String', field => field.resolver(resolver))
        .use(() => 'cached')
        .build();
    const result = await graphql({ schema: builtSchema, source: '{ value }' });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ value: 'cached' });
    expect(resolver).not.toHaveBeenCalled();
});

test.each(['sync', 'async'])('allows middleware to catch %s resolver failures', async (mode): Promise<void> => {

    const recover: Middleware = async (next) => {

        try {
            return await next();
        }
        catch(error){
            return (error as Error).message;
        }
    };
    const resolver = (): string | Promise<string> => {

        if(mode === 'async'){
            return Promise.reject(new Error('recovered'));
        }

        throw new Error('recovered');
    };
    const builtSchema = await schema()
        .query('value', 'String', field => field.resolver(resolver))
        .use(recover)
        .build();
    const result = await graphql({ schema: builtSchema, source: '{ value }' });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ value: 'recovered' });
});

test('supports default resolvers while excluding introspection fields', async (): Promise<void> => {

    const middleware: Middleware = vi.fn(next => next());
    const builtSchema = await schema()
        .query('greet', 'String', field => field.arg('name', 'String'))
        .use(middleware)
        .build();
    const introspection = await graphql({ schema: builtSchema, source: '{ __schema { queryType { name } } __type(name: "Query") { name } }' });

    expect(introspection.errors).toBeUndefined();
    expect(middleware).not.toHaveBeenCalled();

    const result = await graphql({
        schema: builtSchema,
        source: '{ greet(name: "Acme") }',
        rootValue: {
            prefix: 'Hello',
            greet(args: { name: string }): string {

                return `${this.prefix} ${args.name}`;
            }
        }
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ greet: 'Hello Acme' });
    expect(middleware).toHaveBeenCalledOnce();
});

test('does not install inherited middleware twice on shared types in merged schemas', async (): Promise<void> => {

    const fields: string[] = [];
    const child = schema()
        .object('Shared', type => type.field('value', 'String'))
        .query('child', 'Shared', field => field.resolver(() => ({ value: 'child' })));
    const middleware: Middleware = (next, _source, _args, _context, info) => {

        fields.push(`${info.parentType.name}.${info.fieldName}`);
        return next();
    };
    const builtSchema = await schema()
        .query('root', 'Shared', field => field.resolver(() => ({ value: 'root' })))
        .use(middleware)
        .merge(child)
        .build();
    const result = await graphql({ schema: builtSchema, source: '{ root { value } child { value } }' });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ root: { value: 'root' }, child: { value: 'child' } });
    expect(fields).toEqual(['Query.root', 'Shared.value', 'Query.child', 'Shared.value']);
});

test('keeps the original schema independent when applying middleware', async (): Promise<void> => {

    const builtSchema = await schema().query('value', 'String', field => field.resolver(() => 'original')).build();
    const wrappedSchema = applyMiddleware(builtSchema, () => 'wrapped');
    const original = await graphql({ schema: builtSchema, source: '{ value }' });
    const wrapped = await graphql({ schema: wrappedSchema, source: '{ value }' });

    expect(original.errors).toBeUndefined();
    expect(wrapped.errors).toBeUndefined();
    expect(original.data).toEqual({ value: 'original' });
    expect(wrapped.data).toEqual({ value: 'wrapped' });
});
