import { defineConfig } from '@rslib/core';

export default defineConfig({
    source: {
        entry: {
            index: './src/ts/index.ts'
        }
    },
    lib: [
        {
            format: 'esm',
            syntax: 'es2021',
            dts: true
        },
        {
            format: 'cjs',
            syntax: 'es2021'
        }
    ],
    output: {
        target: 'node'
    }
});
