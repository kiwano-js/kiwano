import { expect, test, vi } from 'vitest';

import { aclPlugin } from '../src/ts';

test('authorizes each route against its own resource regardless of request order', async (): Promise<void> => {

    const acl = aclPlugin().allow('/public', 'member').deny('/secret', 'member');
    const middleware = acl.middleware();
    const next = vi.fn();
    const context = (path: string) => ({ req: { path }, get: () => 'member' });

    await middleware(context('/public'), next);
    await expect(middleware(context('/secret'), next)).rejects.toThrow('No access to /secret');
    await middleware(context('/public'), next);

    expect(next).toHaveBeenCalledTimes(2);
});

test('a denied first route does not prevent a later allowed route', async (): Promise<void> => {

    const middleware = aclPlugin().allow('/public', 'member').middleware();
    const next = vi.fn();

    await expect(middleware({ req: { path: '/secret' }, get: () => 'member' }, next)).rejects.toThrow();
    await middleware({ req: { path: '/public' }, get: () => 'member' }, next);

    expect(next).toHaveBeenCalledOnce();
});

test('preserves explicitly configured resources without mutating their configuration', async (): Promise<void> => {

    const config = Object.freeze({ resource: 'api' });
    const middleware = aclPlugin().allow('api', 'member').middleware(config);
    const next = vi.fn();

    await middleware({ req: { path: '/one' }, get: () => 'member' }, next);
    await middleware({ req: { path: '/two' }, get: () => 'member' }, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(config).toEqual({ resource: 'api' });
});
