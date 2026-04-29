import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const normalizeBaseUrl = (value) => String(value || '').trim().replace(/\/+$/, '');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const upstreamBase = normalizeBaseUrl(env.UPSTREAM_API_BASE || env.VITE_UPSTREAM_API_BASE);

  return {
    plugins: [react()],
    server: {
      port: 3000,
      open: true,
      proxy: upstreamBase
        ? {
            // 本地开发：配置 UPSTREAM_API_BASE 后，把 /api/* 转发到上游，避免 CORS。
            // 上线由 api/usage/token.js 这个 Vercel Serverless Function 接管。
            '/api': {
              target: upstreamBase,
              changeOrigin: true,
              secure: true,
              rewrite: (path) => (path === '/api/usage/token' ? '/api/usage/token/' : path),
            },
          }
        : {},
    },
    build: {
      outDir: 'dist',
    },
  };
});
