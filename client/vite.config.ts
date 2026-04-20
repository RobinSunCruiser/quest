/// <reference types="vitest/config" />

import { AliasOptions, defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// @ts-ignore
export default defineConfig(({ command, mode }) => {
    const env = loadEnv(mode, process.cwd());
    return {
        plugins: [react()],
        base: './',
        build: {
            assetsDir: 'assets',
            outDir: './dist',
            chunkSizeWarningLimit: 10000,
        },
        optimizeDeps: {},

        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url)),
                '@root': fileURLToPath(new URL('../', import.meta.url)),
            } as AliasOptions,
        },
        server: {
            https: false,
            proxy: {
                https: false,
                '/socket.io/': {
                    target: env.VITE_SERVER_BASE_URL || 'http://localhost:3000', // Proxy requests to /socket.io to the backend server at http://localhost:3000
                    changeOrigin: true,
                    secure: false,
                    ws: true,
                },
                '/api': {
                    target: env.VITE_SERVER_BASE_URL || 'http://localhost:3000', // Proxy requests to /api to the backend server at http://localhost:3000
                    changeOrigin: true, // Change the origin of the host header to the target URL

                    secure: false, // If using HTTPS and you trust the certificate
                    rewrite: (path) => path.replace(/^\/api/, ''), // Remove /api if not needed by the backend
                },
            },
        },

        test: {
            globals: true, // Make the global objects available in the test environment
            environment: 'jsdom', // Specify JSDOM as the testing environment
            exclude: [
                'node_modules/**', // Exclude node_modules
                'e2e/*', // Exclude end-to-end tests
            ],
            setupFiles: ['./.vite/setup.tests.ts'], // Set up the test environment
            root: fileURLToPath(new URL('./', import.meta.url)), // Set the root for tests
        },
    };
});
