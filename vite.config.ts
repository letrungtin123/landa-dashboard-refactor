import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const lmsUrl = env.VITE_OPENEDX_LMS_URL || 'http://local.openedx.io';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      strictPort: false,
      proxy: {
        // Forward tất cả API calls đến LMS
        '/oauth2': {
          target: lmsUrl,
          changeOrigin: true,
          cookieDomainRewrite: 'localhost',
        },
        // Forward API calls đến CMS (Studio)
        '/cms-api': {
          target: env.VITE_OPENEDX_CMS_URL || 'http://studio.local.openedx.io',
          changeOrigin: true,
          cookieDomainRewrite: 'localhost',
          rewrite: (path) => path.replace(/^\/cms-api/, ''),
        },
        '/api': {
          target: lmsUrl,
          changeOrigin: true,
          cookieDomainRewrite: 'localhost',
        },
        '/login_ajax': {
          target: lmsUrl,
          changeOrigin: true,
          cookieDomainRewrite: 'localhost',
        },
        '/logout': {
          target: lmsUrl,
          changeOrigin: true,
          cookieDomainRewrite: 'localhost',
        },
        // Forward hình ảnh và static files của Open edX
        '/asset-v1:': {
          target: lmsUrl,
          changeOrigin: true,
        },
        '/c4x/': {
          target: lmsUrl,
          changeOrigin: true,
        },
        '/static': {
          target: lmsUrl,
          changeOrigin: true,
        },
        '/media': {
          target: lmsUrl,
          changeOrigin: true,
        },
      },
    },
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            ui: ['framer-motion', 'recharts', 'sonner'],
          },
        },
      },
    },
  };
});
