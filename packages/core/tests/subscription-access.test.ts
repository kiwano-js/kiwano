import { graphql, GraphQLError, parse, subscribe, type ExecutionResult } from 'graphql';
import { expect, test, vi } from 'vitest';

import { aclPlugin, ForbiddenError, schema, type FieldAccessHook, type FieldRuntime, type ResolverInfo } from '../src/ts';

for(const representation of ['object', 'factory', 'factory class', 'default resolve']){
    test.each(['none', 'general', 'specific', 'both'])(`checks subscription phases for ${representation} with %s hooks`, async (selection): Promise<void> => {

        const order: string[] = [];
        const rootValue = { start: true };
        const payloads = [{ updates: 'first' }, { updates: 'second' }];
        const context = { role: 'member', version: 0 };
        const acl = aclPlugin().role('member');
        const validate = acl.validate.bind(acl);
        vi.spyOn(acl, 'validate').mockImplementation((...input) => {

            order.push('acl');
            return validate(...input);
        });
        const canAccess = vi.fn(async function(this: { prefix: string }, input: ResolverInfo<unknown>): Promise<boolean> {

            expect(this.prefix).toBe('owner');
            expect(input.args).toEqual({ label: 'argument' });
            expect(input.context).toBe(context);
            expect(input.info.fieldName).toBe('updates');
            expect(input.info.path.key).toBe('stream');
            order.push('canAccess');
            input.context.version++;
            return true;
        });
        const canSubscribe = vi.fn(function(this: { prefix: string }, input: ResolverInfo<unknown>): boolean {

            expect(this.prefix).toBe('owner');
            expect(input.source).toBe(rootValue);
            order.push('canSubscribe');
            return true;
        });
        const canResolve = vi.fn(async function(this: { prefix: string }, input: ResolverInfo<unknown>): Promise<boolean> {

            expect(this.prefix).toBe('owner');
            expect(payloads).toContain(input.source);
            order.push('canResolve');
            return true;
        });
        const open = vi.fn(function(this: { prefix: string }, source, args, inputContext): AsyncGenerator<{ updates: string }> {

            expect(this.prefix).toBe('owner');
            expect(source).toBe(rootValue);
            expect(args).toEqual({ label: 'argument' });
            expect(inputContext).toBe(context);
            order.push('subscribe');
            return (async function*(): AsyncGenerator<{ updates: string }> {

                yield* payloads;
            })();
        });
        const resolve = vi.fn(function(this: { prefix: string }, source, _args, inputContext): string {

            expect(this.prefix).toBe('owner');
            expect(inputContext).toBe(context);
            order.push('resolve');
            return source.updates;
        });
        const runtime: FieldRuntime = { subscribe: open };
        if(representation !== 'default resolve'){
            runtime.resolve = resolve;
        }

        if(selection === 'general' || selection === 'both'){
            runtime.canAccess = canAccess;
        }

        if(selection === 'specific' || selection === 'both'){
            runtime.canSubscribe = canSubscribe;
            runtime.canResolve = canResolve;
        }

        const factory = vi.fn(function(this: { prefix: string }): FieldRuntime {

            expect(this.prefix).toBe('owner');
            return runtime;
        });

        class SubscriptionResolvers {
            prefix = 'owner';

            updates(): FieldRuntime {

                return factory.call(this);
            }
        }

        const builtSchema = await schema('subscription-access')
            .query('health', 'String')
            .subscription('updates', 'String', field => field.arg('label', 'String').allow('member'))
            .subscriptionResolvers(representation === 'factory class' ? SubscriptionResolvers : { prefix: 'owner', updates: representation === 'factory' ? factory : runtime })
            .use(acl)
            .build();
        const stream = await subscribe({
            schema: builtSchema,
            document: parse('subscription { stream: updates(label: "argument") }'),
            rootValue,
            contextValue: context
        }) as AsyncIterableIterator<ExecutionResult>;
        const general = selection === 'general' || selection === 'both';
        const specific = selection === 'specific' || selection === 'both';

        expect(order).toEqual(['acl', ...(general ? ['canAccess'] : []), ...(specific ? ['canSubscribe'] : []), 'subscribe']);
        expect(factory).toHaveBeenCalledTimes(representation.startsWith('factory') ? 1 : 0);

        for(const payload of payloads){

            order.length = 0;
            expect((await stream.next()).value.data).toEqual({ stream: payload.updates });
            expect(order).toEqual([...(general ? ['canAccess'] : []), ...(specific ? ['canResolve'] : []), ...(representation !== 'default resolve' ? ['resolve'] : [])]);
        }

        expect(canAccess).toHaveBeenCalledTimes(general ? 3 : 0);
        expect(canSubscribe).toHaveBeenCalledTimes(specific ? 1 : 0);
        expect(canResolve).toHaveBeenCalledTimes(specific ? 2 : 0);
        expect(open).toHaveBeenCalledOnce();
        await stream.return?.();
    });
}

for(const phase of ['start', 'event']){
    for(const general of [true, false]){
        test.each([
            ['sync', 'deny'], ['async', 'deny'],
            ['sync', 'authentication'], ['async', 'authentication'],
            ['sync', 'database'], ['async', 'database']
        ])(`stops subscription ${phase} after %s %s from the ${general ? 'general' : 'specific'} check`, async (mode, outcome): Promise<void> => {

            const rootValue = { start: true };
            const payload = { updates: 'event' };
            const error = outcome === 'authentication'
                ? new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } })
                : new Error('Database connection failed');
            const order: string[] = [];
            const fail = (): ReturnType<FieldAccessHook> => {

                if(mode === 'async'){
                    return outcome === 'deny' ? Promise.resolve(false) : Promise.reject(error);
                }

                if(outcome !== 'deny'){
                    throw error;
                }

                return false;
            };
            const canAccess: FieldAccessHook = input => {

                order.push('canAccess');
                return general && input.source === (phase === 'start' ? rootValue : payload) ? fail() : true;
            };
            const runtime: FieldRuntime = {
                canAccess,
                canSubscribe(): ReturnType<FieldAccessHook> {

                    order.push('canSubscribe');
                    return !general && phase === 'start' ? fail() : true;
                },
                canResolve(): ReturnType<FieldAccessHook> {

                    order.push('canResolve');
                    return !general && phase === 'event' ? fail() : true;
                },
                subscribe: vi.fn(async function*(): AsyncGenerator<{ updates: string }> {

                    yield payload;
                }),
                resolve: vi.fn(() => 'unexpected')
            };
            const builtSchema = await schema()
                .query('health', 'String')
                .subscription('updates', 'String')
                .subscriptionResolvers({ updates: runtime })
                .build();
            const start = await subscribe({ schema: builtSchema, document: parse('subscription { updates }'), rootValue });
            let result: ExecutionResult;

            if(phase === 'event'){

                expect(order).toEqual(['canAccess', 'canSubscribe']);
                order.length = 0;
                const stream = start as AsyncIterableIterator<ExecutionResult>;
                result = (await stream.next()).value;
                await stream.return?.();
            }
            else {

                result = start as ExecutionResult;
                expect(runtime.subscribe).not.toHaveBeenCalled();
            }

            expect(order).toEqual(['canAccess', ...(!general ? [phase === 'start' ? 'canSubscribe' : 'canResolve'] : [])]);
            expect(runtime.resolve).not.toHaveBeenCalled();
            expect(result.errors).toHaveLength(1);

            if(outcome !== 'deny'){
                expect(result.errors?.[0].originalError).toBe(error);
            }
            else {
                expect(result.errors?.[0].originalError).toBeInstanceOf(ForbiddenError);
            }
        });
    }
}

test('checks ACL only at subscription start and runs access hooks for every event', async (): Promise<void> => {

    const canAccess = vi.fn(() => true);
    const canSubscribe = vi.fn(() => true);
    const canResolve = vi.fn(() => true);
    const resolve = vi.fn(() => 'event');
    const open = vi.fn(async function*(): AsyncGenerator<string> {

        yield 'first';
        yield 'second';
    });
    const runtime: FieldRuntime = { canAccess, canSubscribe, canResolve, subscribe: open, resolve };
    const context = { role: 'guest' };
    const acl = aclPlugin().role('member').role('guest');
    const validate = vi.spyOn(acl, 'validate');
    const builtSchema = await schema()
        .query('health', 'String')
        .subscription('updates', 'String', field => field.allow('member'))
        .subscriptionResolvers({ updates: runtime })
        .use(acl)
        .build();
    const document = parse('subscription { updates }');
    const denied = await subscribe({ schema: builtSchema, document, contextValue: context }) as ExecutionResult;

    expect(denied.errors?.[0].originalError).toBeInstanceOf(ForbiddenError);
    expect(canAccess).not.toHaveBeenCalled();
    expect(canSubscribe).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
    expect(validate).toHaveBeenCalledOnce();

    context.role = 'member';
    const stream = await subscribe({ schema: builtSchema, document, contextValue: context }) as AsyncIterableIterator<ExecutionResult>;
    context.role = 'guest';
    const event = (await stream.next()).value;

    expect(event.errors).toBeUndefined();
    expect(event.data).toEqual({ updates: 'event' });
    expect(canAccess).toHaveBeenCalledTimes(2);
    expect(canSubscribe).toHaveBeenCalledOnce();
    expect(canResolve).toHaveBeenCalledOnce();
    expect(resolve).toHaveBeenCalledOnce();
    expect(validate).toHaveBeenCalledTimes(2);

    expect((await stream.next()).value.data).toEqual({ updates: 'event' });
    expect(canAccess).toHaveBeenCalledTimes(3);
    expect(canResolve).toHaveBeenCalledTimes(2);
    expect(validate).toHaveBeenCalledTimes(2);
    await stream.return?.();
});

test('executes subscription ACL once at start and access hooks once per phase in merged schemas', async (): Promise<void> => {

    const canAccess = vi.fn(() => true);
    const canSubscribe = vi.fn(() => true);
    const canResolve = vi.fn(() => true);
    const runtime: FieldRuntime = {
        canAccess,
        canSubscribe,
        canResolve,
        async *subscribe(): AsyncGenerator<{ events: string }> {

            yield { events: 'event' };
        }
    };
    const acl = aclPlugin().role('member');
    const validate = vi.spyOn(acl, 'validate');
    const child = schema()
        .query('childHealth', 'String')
        .subscription('events', 'String')
        .subscriptionResolvers({ events: runtime });
    const builtSchema = await schema()
        .query('health', 'String')
        .subscription('other', 'String')
        .subscriptionResolvers({ other: { subscribe: runtime.subscribe } })
        .merge(child)
        .use(acl)
        .allow('member')
        .build();
    const stream = await subscribe({
        schema: builtSchema,
        document: parse('subscription { events }'),
        contextValue: { role: 'member' }
    }) as AsyncIterableIterator<ExecutionResult>;

    expect((await stream.next()).value.data).toEqual({ events: 'event' });
    expect(validate).toHaveBeenCalledOnce();
    expect(canAccess).toHaveBeenCalledTimes(2);
    expect(canSubscribe).toHaveBeenCalledOnce();
    expect(canResolve).toHaveBeenCalledOnce();
    await stream.return?.();
});

test.each([true, false])('retains subscription access hooks with an explicit resolver override (allowed: %s)', async (allowed): Promise<void> => {

    const original = vi.fn(() => 'original');
    const override = vi.fn((source, args, context, info) => {

        expect(source).toEqual({ updates: 'event' });
        expect(args).toEqual({ label: 'argument' });
        expect(context).toEqual({ allowed });
        expect(info.fieldName).toBe('updates');
        return 'override';
    });
    const canAccess = vi.fn(() => true);
    const canResolve = vi.fn((input: ResolverInfo<unknown>) => input.context.allowed);
    const builtSchema = await schema()
        .query('health', 'String')
        .subscription('updates', 'String', field => field.arg('label', 'String').resolver(override))
        .subscriptionResolvers({ updates: {
            canAccess,
            canResolve,
            async *subscribe(): AsyncGenerator<{ updates: string }> {

                yield { updates: 'event' };
            },
            resolve: original
        } })
        .build();
    const stream = await subscribe({
        schema: builtSchema,
        document: parse('subscription { updates(label: "argument") }'),
        contextValue: { allowed }
    }) as AsyncIterableIterator<ExecutionResult>;
    const result = (await stream.next()).value;

    expect(canAccess).toHaveBeenCalledTimes(2);
    expect(canResolve).toHaveBeenCalledOnce();
    expect(original).not.toHaveBeenCalled();

    if(allowed){

        expect(result.data).toEqual({ updates: 'override' });
        expect(override).toHaveBeenCalledOnce();
    }
    else {

        expect(result.errors?.[0].originalError).toBeInstanceOf(ForbiddenError);
        expect(override).not.toHaveBeenCalled();
    }

    await stream.return?.();
});

test('forwards refreshed context to later subscription checks and runtime functions', async (): Promise<void> => {

    const context = { version: 0 };
    const received: unknown[] = [];
    const check = (input: ResolverInfo<unknown>): boolean => {

        received.push(input.context);
        input.context.specific = true;
        return true;
    };
    const builtSchema = await schema()
        .query('health', 'String')
        .subscription('updates', 'Int')
        .subscriptionResolvers({ updates: {
            canAccess(input: ResolverInfo<unknown>): boolean {

                expect(input.context).toBe(context);
                input.context.version++;
                input.context = { version: input.context.version };
                return true;
            },
            canSubscribe: check,
            canResolve: check,
            subscribe(_source, _args, refreshed): AsyncGenerator<number> {

                expect(refreshed).toBe(received[0]);
                expect(refreshed).toEqual({ version: 1, specific: true });
                return (async function*(): AsyncGenerator<number> {

                    yield 0;
                    yield 0;
                })();
            },
            resolve(_source, _args, refreshed): number {

                expect(refreshed).toBe(received.at(-1));
                expect(refreshed.specific).toBe(true);
                return refreshed.version;
            }
        } })
        .build();
    const stream = await subscribe({
        schema: builtSchema,
        document: parse('subscription { updates }'),
        contextValue: context
    }) as AsyncIterableIterator<ExecutionResult>;

    expect((await stream.next()).value.data).toEqual({ updates: 2 });
    expect((await stream.next()).value.data).toEqual({ updates: 3 });
    expect(context.version).toBe(3);
    expect(received).toHaveLength(3);
    await stream.return?.();
});

test('keeps query and mutation resolver methods as ordinary data resolvers', async (): Promise<void> => {

    const unexpected = vi.fn(() => { throw new Error('Data must not be treated as runtime configuration'); });
    const data = { name: 'value', canAccess: unexpected, canResolve: unexpected, resolve: unexpected };
    const result = vi.fn(function(this: { prefix: string }): typeof data {

        expect(this.prefix).toBe('owner');
        return data;
    });
    const builtSchema = await schema()
        .object('Result', object => object.field('name', 'String'))
        .query('result', 'Result')
        .mutation('result', 'Result')
        .queryResolvers({ prefix: 'owner', result })
        .mutationResolvers({ prefix: 'owner', result })
        .build();

    expect(result).not.toHaveBeenCalled();

    for(const source of ['{ result { name } }', 'mutation { result { name } }']){

        const response = await graphql({ schema: builtSchema, source });
        expect(response.errors).toBeUndefined();
        expect(response.data).toEqual({ result: { name: 'value' } });
    }

    expect(result).toHaveBeenCalledTimes(2);
    expect(unexpected).not.toHaveBeenCalled();
});
