import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/js/staff/bootstrap.tsx',
                'resources/js/client/bootstrap.tsx',
            ],
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    server: {
        host: '0.0.0.0',
        port: Number(process.env.VITE_PORT ?? 5173),
        strictPort: true,
        origin: process.env.VITE_DEV_SERVER_URL,
        // laravel-vite-plugin copies server.origin into cors.origin when cors is unset.
        // origin must stay the Vite URL for Docker HMR; CORS must still allow Laravel on :8000.
        cors: {
            origin: [
                process.env.APP_URL ?? 'http://localhost:8000',
                /^https?:\/\/(?:(?:[^:]+\.)?localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/,
            ],
        },
        hmr: {
            host: process.env.VITE_HMR_HOST ?? 'localhost',
            port: Number(process.env.VITE_PORT ?? 5173),
            clientPort: Number(process.env.VITE_PORT ?? 5173),
        },
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
