import { createRequire } from 'node:module';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        // Share the GraphQL runtime with the external schema and middleware packages.
        alias: [
            { find: /^graphql(?:\/type\/definition)?$/, replacement: createRequire(import.meta.url).resolve('graphql') },
            { find: /^@kiwano\/core$/, replacement: createRequire(import.meta.url).resolve('../core/src/ts/index.ts') }
        ]
    },
    // Configure Vitest (https://vitest.dev/config/)
    test: {}
});
