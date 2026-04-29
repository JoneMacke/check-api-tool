# check-api-tool

> 极简的 NewAPI / OneAPI 令牌额度查询前端。
> 输入 `sk-xxxx`，立刻看到这把令牌的总额度、已用、剩余、过期时间、模型限制。

## ✨ 特性

- ⚡ **Vite 5 + React 18**，零冗余依赖（运行时仅 `react`、`react-dom`）
- 🧼 **单文件 UI**：`src/App.jsx` 一文到底，没有路由、没有状态库、没有 UI 框架
- 🌐 **原生 fetch**，不再依赖 axios
- 🛡️ **同源 `/api`**：本地 Vite proxy、线上 Vercel Serverless Function / Nginx 反代，**彻底规避 CORS**
- 🧩 **响应兼容**：`code: true | "success" | 1` 全部识别为成功
- 🐳 **一键 Docker**：多阶段构建 → Nginx 静态托管 + 反代

## 🚀 本地开发

```bash
npm install
npm run dev          # http://localhost:3000
```

`/api/*` 会被代理到 `https://api.katioai.com`。要切到自己的后端，改 `vite.config.js`：

```js
proxy: {
  '/api': { target: 'https://your-newapi.example.com', changeOrigin: true },
},
```

也可以通过环境变量直连（适合调试）：

```bash
# .env.local
VITE_API_BASE=https://api.katioai.com
```

## 📦 构建 & 预览

```bash
npm run build        # 输出到 dist/
npm run preview      # 本地预览构建产物
```

构建产物：`index.html` + `assets/index-*.js` + `assets/index-*.css`，gzip 后约 50 KB。

## ☁️ 部署

### Vercel

仓库已包含 `api/usage/token.js` 和 `vercel.json`，直接 Import 即可：

| 配置        | 值              |
| ----------- | --------------- |
| Build       | `npm run build` |
| Output Dir  | `dist`          |
| API Proxy   | `/api/usage/token` → Vercel Function → `https://api.katioai.com/api/usage/token/` |

线上不再使用外部 `rewrites` 转发 API，避免 `/api/*` 被 SPA fallback 成 `index.html`。

要换后端，编辑 `api/usage/token.js` 里的 `UPSTREAM_URL` 即可。

### Docker

```bash
docker build -t check-api-tool .
docker run -d -p 8080:80 --name check-api-tool check-api-tool
# open http://localhost:8080
```

镜像基于 `nginx:1.27-alpine`，已内置：

- `/api/*` 反代到 `https://api.katioai.com`
- SPA fallback 到 `index.html`
- `/assets/*` 一年长缓存

## 🔌 API 约定

- **Frontend Endpoint**: `GET /api/usage/token`
- **Upstream Endpoint**: `GET https://api.katioai.com/api/usage/token/`
- **Auth**: `Authorization: Bearer sk-xxxxxxxx`
- **Response**:

```json
{
  "code": true,
  "data": {
    "name": "ceshi",
    "expires_at": 0,
    "total_granted": 25000000,
    "total_used": 0,
    "total_available": 25000000,
    "unlimited_quota": false,
    "model_limits": {},
    "model_limits_enabled": false
  },
  "message": "ok"
}
```

> 单位换算：上游 `quota` 字段 **500 000 = 1 美元**，前端会自动换算成 `$x.xxxx` 显示。

## 📁 项目结构

```
.
├── index.html            # 入口 HTML
├── api/
│   └── usage/token.js    # Vercel Serverless API 代理
├── src/
│   ├── index.jsx         # React 挂载点
│   ├── App.jsx           # 全部 UI + fetch 逻辑
│   └── index.css         # 全局样式（仅 reset + body 渐变）
├── public/
│   └── robots.txt        # 搜索引擎爬虫规则
├── vite.config.js        # 含 dev proxy
├── vercel.json           # Vercel 构建与静态资源缓存配置
├── Dockerfile            # 多阶段构建 + nginx
└── package.json
```

## 📝 License

MIT
