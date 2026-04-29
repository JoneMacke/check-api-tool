# Check API Key Tool

一个面向 [New API](https://github.com/Calcium-Ion/new-api) / [One API](https://github.com/songquanpeng/one-api) 网关的 **令牌（API Key）自助查询前端**。
用户输入 `sk-xxxx` 即可查看令牌额度、剩余配额、过期时间，以及完整的模型调用日志，并支持一键导出 CSV。

> 纯前端 SPA，零后端依赖，可一键部署到 **Vercel / Docker / 宝塔面板** 等任意静态托管环境。

---

## ✨ 功能特性

- 🔑 输入 API Key 即时查询令牌信息（名称、总额度、已用、剩余、过期时间）
- 📊 调用日志：模型、tokens、用时、费用，分页 + 汇总
- 🌐 多站点支持：通过 JSON 配置同时接入多个上游网关，自动切 Tab
- 🌓 内置明亮 / 暗黑主题切换，移动端自适应
- 📥 一键导出日志为 CSV（基于 PapaParse）
- ⚙️ 通过环境变量灵活控制：是否展示余额、是否展示明细、GitHub 图标显隐
- 🚀 基于 **Vite 5 + React 18 + Semi Design**，构建产物纯静态、首屏极快

---

## 🧱 技术栈

| 模块 | 选型 |
| --- | --- |
| 构建工具 | Vite 5 |
| 框架 | React 18（函数组件 + Hooks） |
| UI | @douyinfe/semi-ui (Semi Design) |
| 网络 | axios |
| 数据处理 | papaparse（CSV） |
| 部署 | 静态托管（Vercel / Nginx / 宝塔） / Docker |

---

## 🚀 快速开始（本地开发）

```bash
# 1. 克隆
git clone https://github.com/your-name/check-api-tool.git
cd check-api-tool

# 2. 安装依赖（推荐 Node 18+）
npm install

# 3. 创建 .env（参考 .env.example）
cp .env.example .env

# 4. 启动开发服务器（默认 http://localhost:3000）
npm run dev

# 5. 生产构建（产物在 dist/）
npm run build
npm run preview   # 本地预览构建产物
```

---

## ⚙️ 环境变量

所有变量均以 `REACT_APP_` 前缀（兼容历史 CRA 习惯，由 Vite 在构建时注入到 `process.env`）。
配置文件示例见 [`.env.example`](./.env.example)。

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `REACT_APP_BASE_URL` | 上游 API 网关地址。**单站点**直接写 URL；**多站点**写 JSON 对象 | 必填 |
| `REACT_APP_SHOW_BALANCE` | 是否展示余额信息卡片 | `true` |
| `REACT_APP_SHOW_DETAIL` | 是否展示调用明细日志 | `true` |
| `REACT_APP_SHOW_ICONGITHUB` | 是否在顶栏显示 GitHub 图标 | `true` |

`REACT_APP_BASE_URL` 两种合法写法：

```env
# 单站点
REACT_APP_BASE_URL=https://api.example.com

# 多站点（页面会以 Tab 形式切换）
REACT_APP_BASE_URL={"主站": "https://api.a.com", "备用": "https://api.b.com"}
```

> ⚠️ 由于使用 Vite 的 `define`，环境变量在 **构建时** 被静态替换。
> 修改 `.env` 后需要重新 `npm run build` / 重启 dev server / 在 Vercel 重新触发部署。

---

## ▲ 一、Vercel 部署（最快，免费）

### 方式 A：一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-name%2Fcheck-api-tool)

### 方式 B：手动部署

1. Fork 本仓库到自己的 GitHub
2. 登录 [vercel.com](https://vercel.com) → **Add New Project** → 选择该仓库
3. **Framework Preset** 选择 `Other`（仓库内已自带 [`vercel.json`](./vercel.json)，会自动识别）
   - Build Command：`npm run build`
   - Output Directory：`dist`
   - Install Command：`npm install`
4. 在 **Environment Variables** 中按需添加：
   ```
   REACT_APP_BASE_URL = {"主站":"https://api.example.com"}
   REACT_APP_SHOW_BALANCE = true
   REACT_APP_SHOW_DETAIL  = true
   REACT_APP_SHOW_ICONGITHUB = true
   ```
5. 点击 **Deploy**，等待构建完成即可访问。

> ✅ `vercel.json` 已内置 SPA 路由 fallback（`/(.*) → /index.html`）和静态资源 1 年强缓存。
> 修改环境变量后请到 Vercel **Deployments → ⋯ → Redeploy** 重新构建。

---

## 🐳 二、Docker 部署

仓库根目录提供了多阶段 [`Dockerfile`](./Dockerfile)：Node 构建 + Nginx 运行，最终镜像 ~30MB。

### 1. 构建镜像

```bash
docker build \
  --build-arg NODE_ENV=production \
  -t check-api-tool:latest .
```

> 由于环境变量在构建时注入，建议在构建前把 `.env` 放到项目根目录，或使用下面 `docker run` 时的方案 B（运行时挂载已构建好的 `dist/`）。

### 2. 运行容器

```bash
docker run -d \
  --name check-api-tool \
  -p 8080:80 \
  --restart unless-stopped \
  check-api-tool:latest
```

打开 `http://服务器IP:8080` 即可访问。

### 3. 使用 docker-compose（推荐）

新建 `docker-compose.yml`：

```yaml
services:
  check-api-tool:
    build: .
    container_name: check-api-tool
    ports:
      - "8080:80"
    restart: unless-stopped
```

```bash
docker compose up -d --build
```

### 4. 反向代理 + HTTPS（可选）

将外层 Nginx / Caddy / Traefik 反代到 `127.0.0.1:8080` 即可。示例 Nginx：

```nginx
server {
    listen 443 ssl http2;
    server_name token.example.com;
    ssl_certificate     /etc/letsencrypt/live/token.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/token.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 🛠️ 三、宝塔面板部署

宝塔面板（aaPanel）部署有两种推荐姿势：**纯静态站点**（最简单）或 **Docker 应用**。

### 方式 A：纯静态站点（推荐）

#### 1. 在本地构建产物

```bash
npm install
# 在项目根目录创建 .env 并填写好 REACT_APP_BASE_URL 等
npm run build
```

构建完成后会得到 `dist/` 目录。

#### 2. 上传到服务器

将整个 `dist/` 目录里的内容（**注意：是里面的文件，而不是 dist 文件夹本身**）通过宝塔的 **文件管理** 上传到 `/www/wwwroot/check-api-tool/`。

#### 3. 在宝塔创建站点

1. **网站 → 添加站点**
   - 域名：`token.your-domain.com`
   - 根目录：`/www/wwwroot/check-api-tool`
   - PHP 版本：`纯静态`
2. 站点创建后，进入 **设置 → 配置文件**，在 `server { ... }` 块内加入 SPA fallback：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}

# 静态资源强缓存
location ~* ^/assets/.*\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$ {
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

3. 保存配置 → **SSL** 中申请 Let's Encrypt 证书并开启 **强制 HTTPS** 即可。

> 之后如需修改环境变量，重新本地 `npm run build`，把新的 `dist/` 内容覆盖上传即可。

#### （可选）在服务器上直接构建

如果不想在本地构建，可在宝塔的 **软件商店** 中安装 **Node.js 版本管理器**，安装 Node 18+，然后在服务器上执行：

```bash
cd /www/wwwroot/check-api-tool
git clone https://github.com/your-name/check-api-tool.git .
cp .env.example .env
vi .env                 # 修改 REACT_APP_BASE_URL 等
npm install
npm run build
# 让站点根目录指向 dist
```

然后到宝塔站点设置中，把站点根目录改为 `/www/wwwroot/check-api-tool/dist`，并加上上面的 SPA fallback。

### 方式 B：宝塔 Docker 部署

1. 在宝塔 **软件商店** 安装 **Docker 管理器**
2. 进入 **Docker → 镜像 → 构建**，选择项目目录构建 `check-api-tool:latest`
3. **容器 → 添加容器**：端口映射 `8080:80`，重启策略 `unless-stopped`
4. 在宝塔 **网站 → 反向代理** 创建一个站点反向代理到 `http://127.0.0.1:8080`，并申请 SSL

---

## ❓ 常见问题

### 1. 部署后页面正常，但点查询提示跨域 / 401？
请确认上游 New API / One API 已开启 CORS，或将本工具与上游放在同一域下用反向代理转发 `/api/*`。

### 2. Vercel 部署后修改了环境变量没生效？
环境变量在构建时注入。请在 Vercel **Deployments** 页面手动 **Redeploy**（不要勾选 Use existing build cache）。

### 3. 多站点 JSON 在 Vercel 里怎么填？
直接把整段 JSON 当作字符串粘进 `REACT_APP_BASE_URL` 的 Value，例如：
```
{"主站":"https://api.a.com","备用":"https://api.b.com"}
```

### 4. 如何隐藏 GitHub 图标？
设置 `REACT_APP_SHOW_ICONGITHUB=false` 后重新构建。

---

## 📜 License

MIT © Check API Key Tool Contributors

如果这个项目对你有帮助，欢迎 ⭐ Star 支持一下～
