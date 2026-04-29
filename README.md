# check-api-tool

极简的 NewAPI/OneAPI 令牌额度查询前端。

## 技术栈

- Vite 5 + React 18（无其它运行时依赖）
- 原生 fetch，没有 axios 包装
- 同源请求 `/api/*`，由 Vercel rewrite（线上）/ Vite proxy（本地）反代到真实后端，**彻底规避 CORS**

## 本地开发

```bash
npm install
npm run dev
```

默认在 http://localhost:3000 打开。`/api/*` 自动转发到 `https://api.katioai.com`。

如需指向其他后端，修改 `vite.config.js` 中的 `proxy.target`。

## 构建

```bash
npm run build      # 产物在 dist/
npm run preview    # 预览构建产物
```

## 部署

### Vercel

仓库已包含 `vercel.json`。直接 Import 仓库即可：

- Build: `npm run build`
- Output: `dist`
- Rewrites：`/api/*` → `https://api.katioai.com/api/*`

> 修改后端地址只需编辑 `vercel.json` 中的 `destination`。

### Docker / 自有服务器

```bash
docker build -t check-api-tool .
docker run -p 8080:80 check-api-tool
```

镜像基于 nginx，已配置把 `/api/*` 反代到 `https://api.katioai.com`，并对 SPA 路由 fallback 到 `index.html`。

## API 兼容性

- 端点：`GET /api/usage/token/`
- 鉴权：`Authorization: Bearer sk-xxxx`
- 响应（兼容 `code: true | "success" | 1`）：

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
