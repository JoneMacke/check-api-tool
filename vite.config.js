import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// 让 vite 兼容 CRA 的 REACT_APP_ 环境变量前缀，并把 src 里所有
// process.env.REACT_APP_xxx 静态注入，避免业务代码改动。
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'REACT_APP_');
  const define = Object.fromEntries(
    Object.entries(env).map(([k, v]) => [`process.env.${k}`, JSON.stringify(v)])
  );
  // 兜底：即便 .env 里没设置，也避免运行时 process is not defined
  define['process.env.NODE_ENV'] = JSON.stringify(mode);

  return {
    plugins: [react()],
    envPrefix: 'REACT_APP_',
    define,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    // 允许 .js 文件中包含 JSX（CRA 默认行为）
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.jsx?$/,
      exclude: [],
    },
    optimizeDeps: {
      esbuildOptions: {
        loader: { '.js': 'jsx' },
      },
    },
    server: {
      port: 3000,
      open: true,
    },
    build: {
      outDir: 'dist',
    },
  };
});
