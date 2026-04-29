import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      // 本地开发：把 /api/* 转发到上游，避免 CORS。
      // 上线由 api/usage/token.js 这个 Vercel Serverless Function 接管。
      '/api': {
        target: 'https://api.katioai.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => (path === '/api/usage/token' ? '/api/usage/token/' : path),
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
