import { createRequire } from 'node:module';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        // Use the same GraphQL module as the external schema and middleware packages.
        alias: [{ find: /^graphql$/, replacement: createRequire(import.meta.url).resolve('graphql') }]
    },
    // Configure Vitest (https://vitest.dev/config/)
    test: {}
});
