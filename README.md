# check-api-tool

> 一个用于查询 NewAPI / OneAPI 令牌额度的轻量前端工具。  
> 输入 `sk-xxxx` 类型令牌后，通过同源代理请求上游接口，并以美元额度形式展示总额度、已使用额度、剩余额度、过期时间与模型限制。

## 目录

- [功能特性](#功能特性)
- [工作原理](#工作原理)
- [快速开始](#快速开始)
- [环境变量说明](#环境变量说明)
- [部署方式](#部署方式)
  - [Vercel 部署](#vercel-部署)
  - [Docker 部署](#docker-部署)
  - [静态站点部署](#静态站点部署)
- [使用说明](#使用说明)
- [API 约定](#api-约定)
- [常见问题](#常见问题)
- [项目结构](#项目结构)

## 功能特性

- ⚡ **Vite 5 + React 18**：构建快、依赖少、易部署。
- 🎨 **二次元风格 UI**：令牌输入、余额卡片、提示消息集中在一个页面。
- 🌐 **同源 API 代理**：前端请求 `/api/usage/token`，避免浏览器 CORS 问题。
- 🔐 **不在前端硬编码上游地址**：生产环境推荐通过服务端环境变量配置上游 API。
- 💵 **额度自动换算**：默认按 `500000 quota = 1 USD` 展示美元额度。
- 🧩 **响应兼容**：支持 `code: true`、`code: "success"`、`code: 1`、`success: true` 等成功响应格式。
- 📦 **支持 Vercel / Docker / 静态站点** 等多种部署方式。

## 工作原理

```text
浏览器
  │
  │ GET /api/usage/token
  │ Authorization: Bearer sk-xxxxxxxx
  ▼
同源代理层
  ├─ Vercel: api/usage/token.js
  ├─ Docker: Nginx proxy_pass
  └─ 本地开发: Vite dev proxy
  │
  ▼
上游 NewAPI / OneAPI 示例站点
  GET https://api.example.com/api/usage/token/
```

前端不会直接保存你的令牌，也不会把令牌写入仓库。令牌只会作为请求头 `Authorization: Bearer sk-xxxxxxxx` 发送到同源代理，再由代理转发给你的上游接口。

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置本地环境变量

复制示例环境变量文件：

```bash
copy .env.example .env.local
```

在 `.env.local` 中填写你的上游 API 根地址，例如：

```env
UPSTREAM_API_BASE=https://api.example.com
VITE_QUOTA_PER_USD=500000
```

> `UPSTREAM_API_BASE` 不要以 `/` 结尾。  
> 如果你的令牌查询接口不是 `/api/usage/token/`，可以改用 `UPSTREAM_TOKEN_USAGE_URL` 指定完整 URL。

### 3. 启动开发服务

```bash
npm run dev
```

默认访问：

```text
http://localhost:3000
```

本地开发时，浏览器请求 `/api/usage/token`，Vite 会根据 `UPSTREAM_API_BASE` 把请求代理到：

```text
https://api.example.com/api/usage/token/
```

### 4. 构建生产产物

```bash
npm run build
```

构建结果会输出到：

```text
dist/
```

### 5. 本地预览生产产物

```bash
npm run preview
```

默认访问：

```text
http://localhost:3000
```

## 环境变量说明

| 变量名 | 是否必填 | 使用位置 | 示例值 | 说明 |
| --- | --- | --- | --- | --- |
| `UPSTREAM_API_BASE` | Vercel / 本地代理必填 | 服务端 / Vite dev proxy | `https://api.example.com` | 上游 NewAPI / OneAPI 站点根地址，不要以 `/` 结尾。 |
| `UPSTREAM_TOKEN_USAGE_URL` | 可选 | Vercel Serverless Function | `https://api.example.com/api/usage/token/` | 完整令牌查询接口地址。配置后优先级高于 `UPSTREAM_API_BASE`。 |
| `VITE_API_BASE` | 可选 | 浏览器前端 | `https://api.example.com` | 仅用于前端直连调试。生产环境通常留空，使用同源 `/api/usage/token`。 |
| `VITE_QUOTA_PER_USD` | 可选 | 浏览器前端 | `500000` | quota 到美元的换算比例，默认 `500000`。 |

推荐生产配置：

```env
UPSTREAM_API_BASE=https://api.example.com
VITE_QUOTA_PER_USD=500000
```

不推荐在生产环境设置 `VITE_API_BASE`，因为这会让浏览器直接访问上游接口，可能遇到 CORS 或暴露上游地址。

## 部署方式

### Vercel 部署

本项目已经包含：

- `vercel.json`：指定构建命令、输出目录、静态资源缓存策略。
- `api/usage/token.js`：Vercel Serverless Function，用于代理上游令牌查询接口。

#### 步骤 1：推送代码到 GitHub

```bash
git add .
git commit -m "Initial deploy"
git push origin main
```

#### 步骤 2：在 Vercel 导入项目

1. 打开 Vercel 控制台。
2. 选择 **Add New Project**。
3. 导入当前 GitHub 仓库。
4. Framework Preset 可保持默认或选择 Vite。

#### 步骤 3：确认构建配置

| 配置项 | 值 |
| --- | --- |
| Install Command | `npm install` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

这些配置已经写入 `vercel.json`，通常不需要手动修改。

#### 步骤 4：配置环境变量

在 Vercel 项目中进入：

```text
Project Settings -> Environment Variables
```

添加：

```env
UPSTREAM_API_BASE=https://api.example.com
VITE_QUOTA_PER_USD=500000
```

如果你的上游完整接口不是标准路径，也可以添加：

```env
UPSTREAM_TOKEN_USAGE_URL=https://api.example.com/api/usage/token/
```

#### 步骤 5：重新部署

环境变量添加后，建议执行一次 **Redeploy**。部署完成后访问你的 Vercel 域名，例如：

```text
https://your-project.vercel.app
```

#### Vercel 请求链路

```text
https://your-project.vercel.app
  └─ /api/usage/token
      └─ api/usage/token.js
          └─ https://api.example.com/api/usage/token/
```

### Docker 部署

项目提供了 `Dockerfile`，会先使用 Node 构建前端，再使用 Nginx 托管静态文件。

#### 构建镜像

```bash
docker build -t check-api-tool .
```

#### 启动容器

```bash
docker run -d -p 8080:80 --name check-api-tool check-api-tool
```

访问：

```text
http://localhost:8080
```

#### Docker 上游地址说明

当前 `Dockerfile` 中的 Nginx 反代地址是示例：

```nginx
proxy_pass https://api.example.com/api/usage/token/;
proxy_set_header Host api.example.com;
```

部署到自己的环境前，请把 `Dockerfile` 中的 `api.example.com` 替换为你的 NewAPI / OneAPI 域名，然后重新构建镜像。

如果你希望运行容器时动态传入上游地址，建议改造为模板化 Nginx 配置，例如使用 `envsubst` 在容器启动时生成配置文件。

### 静态站点部署

如果你只把 `dist/` 部署到纯静态托管平台，例如对象存储、GitHub Pages、普通 CDN，需要注意：

- 纯静态平台不能运行 `api/usage/token.js`。
- `/api/usage/token` 不会自动代理到上游。
- 你需要额外准备一个后端代理服务，或者配置平台提供的 Rewrite / Function 能力。

可选方案：

1. **推荐**：使用 Vercel / Netlify Functions / Cloudflare Workers 提供同源代理。
2. **临时调试**：设置 `VITE_API_BASE=https://api.example.com` 让浏览器直连上游，但这要求上游允许 CORS。
3. **自建 Nginx**：静态文件由 Nginx 托管，同时把 `/api/usage/token` 反代到上游接口。

## 使用说明

1. 打开部署后的网站。
2. 在“召唤令牌”输入框中输入令牌，例如：

   ```text
   sk-xxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. 点击“开始查询”。
4. 查询成功后页面会展示：
   - 剩余美元额度
   - 总美元额度
   - 已使用美元额度
   - 令牌名称
   - 过期时间
   - 模型限制
5. 如需排查响应内容，可点击“复制 JSON”复制完整返回数据。

## API 约定

### 前端请求

```http
GET /api/usage/token HTTP/1.1
Authorization: Bearer sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

### 上游请求

默认由代理转发到：

```http
GET https://api.example.com/api/usage/token/ HTTP/1.1
Authorization: Bearer sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

### 示例响应

```json
{
  "code": true,
  "data": {
    "name": "example-token",
    "expires_at": 0,
    "total_granted": 25000000,
    "total_used": 500000,
    "total_available": 24500000,
    "unlimited_quota": false,
    "model_limits": {},
    "model_limits_enabled": false
  },
  "message": "ok"
}
```

前端会按以下字段计算并展示：

| 字段 | 说明 |
| --- | --- |
| `total_granted` | 总 quota |
| `total_used` | 已使用 quota |
| `total_available` | 剩余 quota |
| `unlimited_quota` | 是否无限额度 |
| `expires_at` | Unix 秒级时间戳，`0` 表示永不过期 |
| `model_limits` | 模型白名单或限制 |
| `model_limits_enabled` | 是否启用模型限制 |

默认换算规则：

```text
500000 quota = 1 USD
```

如果你的系统换算比例不同，请设置：

```env
VITE_QUOTA_PER_USD=你的换算比例
```

## 常见问题

### 1. 页面提示“服务端未配置 UPSTREAM_API_BASE 环境变量”

说明 Vercel Function 没有读取到上游地址。请在 Vercel 环境变量中添加：

```env
UPSTREAM_API_BASE=https://api.example.com
```

添加后重新部署。

### 2. 页面提示“上游返回的不是 JSON”

常见原因：

- `UPSTREAM_API_BASE` 写错。
- 上游接口路径不是 `/api/usage/token/`。
- 上游返回了 HTML 错误页或登录页。

解决方式：

```env
UPSTREAM_TOKEN_USAGE_URL=https://api.example.com/api/usage/token/
```

用完整接口地址覆盖默认拼接规则。

### 3. 本地开发点击查询没有反应或 404

请确认 `.env.local` 中已经配置：

```env
UPSTREAM_API_BASE=https://api.example.com
```

修改 `.env.local` 后需要重启开发服务：

```bash
npm run dev
```

### 4. 是否会泄露 Token？

项目不会把 Token 写入前端代码或仓库。查询时 Token 会出现在浏览器请求头中，并由同源代理转发给上游 API。请确保你部署的代理服务与上游 API 都是可信的，并使用 HTTPS。

### 5. 为什么不建议生产环境配置 `VITE_API_BASE`？

`VITE_` 开头的变量会被打包进前端代码。设置 `VITE_API_BASE` 后，浏览器会直接请求该地址，可能出现：

- CORS 被拦截。
- 上游域名暴露在前端。
- 难以统一处理上游错误。

因此生产环境推荐使用同源代理：浏览器请求 `/api/usage/token`，由服务端代理转发到上游。

## 项目结构

```text
.
├── api/
│   └── usage/
│       └── token.js        # Vercel Serverless API 代理
├── public/                 # 静态资源
├── src/
│   ├── App.jsx             # 页面 UI、查询逻辑、数据格式化
│   ├── index.css           # 全局样式
│   └── index.jsx           # React 挂载入口
├── .env.example            # 环境变量示例
├── Dockerfile              # 多阶段构建 + Nginx 托管
├── index.html              # Vite HTML 入口
├── package.json            # npm scripts 与依赖
├── vercel.json             # Vercel 构建配置
└── vite.config.js          # Vite 配置与本地代理
```

## License

MIT