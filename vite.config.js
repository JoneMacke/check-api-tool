import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      // 本地开发：把 /api/* 转发到上游，避免 CORS。
      // 上线由 vercel.json 的 rewrites 接管。
      '/api': {
        target: 'https://api.katioai.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
