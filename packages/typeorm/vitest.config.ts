import { createRequire } from 'node:module';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        // Match the GraphQL instance used by the external schema packages.
        alias: [{ find: /^graphql$/, replacement: createRequire(import.meta.url).resolve('graphql') }]
    },
    // Configure Vitest (https://vitest.dev/config/)
    test: {}
});
