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
