# check-api-tool

一个用于查询 NewAPI / OneAPI 令牌额度的轻量前端工具。输入 `sk-xxxx` 令牌后，页面会请求同源接口 `/api/usage/token`，再由代理转发到你的上游 NewAPI / OneAPI 接口，并按美元额度展示总额度、已使用额度、剩余额度、过期时间与模型限制。

本文档主要说明每种部署方式的使用教程。

## 一、准备工作

### 1. 安装依赖

```bash
npm install
```

### 2. 配置本地环境变量

复制示例文件：

```bash
copy .env.example .env.local
```

常用配置示例：

```env
# 上游 NewAPI / OneAPI 站点根地址，不要以 / 结尾
UPSTREAM_API_BASE=https://api.example.com

# 可选：页面右上角“前往控制台”地址
VITE_CONSOLE_URL=https://console.example.com

# 可选：额度换算比例，默认 500000 quota = 1 USD
VITE_QUOTA_PER_USD=500000
```

如果你的令牌查询接口不是标准路径 `/api/usage/token/`，可以使用完整地址覆盖：

```env
UPSTREAM_TOKEN_USAGE_URL=https://api.example.com/api/usage/token/
```

### 3. 本地运行

```bash
npm run dev
```

默认访问：

```text
http://localhost:3000
```

本地开发时，`vite.config.js` 会读取 `UPSTREAM_API_BASE`，把浏览器请求的 `/api/*` 代理到上游接口，避免 CORS 问题。

### 4. 构建生产文件

```bash
npm run build
```

构建结果输出到：

```text
dist/
```

## 二、Vercel 部署

项目内置以下 Vercel 相关文件：

- `vercel.json`：指定构建命令、输出目录与静态资源缓存策略。
- `api/usage/token.js`：Vercel Serverless Function，用于代理上游接口。

### 步骤 1：推送项目到 GitHub

```bash
git add .
git commit -m "deploy check-api-tool"
git push origin main
```

### 步骤 2：导入 Vercel

1. 打开 Vercel 控制台。
2. 点击 **Add New Project**。
3. 选择当前 GitHub 仓库。
4. Framework Preset 可选择 Vite，也可以保持自动识别。

### 步骤 3：确认构建配置

| 配置项 | 值 |
| --- | --- |
| Install Command | `npm install` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

这些值已经写在 `vercel.json` 中，通常不用手动修改。

### 步骤 4：配置环境变量

在 Vercel 项目中进入：

```text
Project Settings -> Environment Variables
```

添加：

```env
UPSTREAM_API_BASE=https://api.example.com
VITE_CONSOLE_URL=https://console.example.com
VITE_QUOTA_PER_USD=500000
```

如果你的上游接口路径不同，再添加：

```env
UPSTREAM_TOKEN_USAGE_URL=https://api.example.com/api/usage/token/
```

### 步骤 5：重新部署

环境变量配置后，执行一次 **Redeploy**。部署完成后访问你的 Vercel 域名即可。

Vercel 请求链路：

```text
浏览器 /api/usage/token
  -> Vercel Function api/usage/token.js
  -> 上游 https://api.example.com/api/usage/token/
```

## 三、Docker 部署

项目提供了 `Dockerfile`，会先用 Node 构建前端，再用 Nginx 托管静态文件。

### 步骤 1：修改上游地址

部署前请把 `Dockerfile` 中的示例域名替换为你的上游域名：

```nginx
proxy_pass https://api.example.com/api/usage/token/;
proxy_set_header Host api.example.com;
```

同时也要修改通用 `/api/` 反代中的域名。

### 步骤 2：构建镜像

```bash
docker build -t check-api-tool .
```

### 步骤 3：启动容器

```bash
docker run -d -p 8080:80 --name check-api-tool check-api-tool
```

访问：

```text
http://localhost:8080
```

### Docker 注意事项

- `VITE_CONSOLE_URL`、`VITE_QUOTA_PER_USD` 是前端构建时变量，如需修改，需要在构建镜像前配置。
- 当前 `Dockerfile` 的 Nginx 上游地址是写死的；如果希望容器启动时动态传入上游地址，可以改造成 Nginx 模板 + `envsubst` 的方式。

## 四、宝塔面板部署

宝塔面板推荐使用 **Nginx 静态站点 + 反向代理接口** 的方式部署。

### 步骤 1：本地构建

在本地或服务器执行：

```bash
npm install
npm run build
```

构建完成后会生成 `dist/` 目录。

### 步骤 2：创建站点

1. 登录宝塔面板。
2. 进入 **网站** -> **添加站点**。
3. 填写你的域名，例如：

   ```text
   key.example.com
   ```

4. PHP 版本选择 **纯静态**。
5. 创建完成后，进入站点根目录。

### 步骤 3：上传前端文件

把 `dist/` 目录中的所有文件上传到宝塔站点根目录，例如：

```text
/www/wwwroot/key.example.com/
```

注意是上传 `dist` 里面的内容，不是上传整个 `dist` 文件夹。

### 步骤 4：配置 Nginx 反向代理

进入宝塔站点设置：

```text
网站 -> 对应站点 -> 配置文件
```

在 `server { ... }` 中加入以下配置，并把 `api.example.com` 替换为你的 NewAPI / OneAPI 域名：

```nginx
# 令牌额度查询接口
location = /api/usage/token {
    proxy_pass https://api.example.com/api/usage/token/;
    proxy_set_header Host api.example.com;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Authorization $http_authorization;
    proxy_ssl_server_name on;
    proxy_http_version 1.1;
}

# SPA 前端路由 fallback
location / {
    try_files $uri $uri/ /index.html;
}
```

如果还需要把其他 `/api/` 请求也代理到上游，可以额外加入：

```nginx
location /api/ {
    proxy_pass https://api.example.com;
    proxy_set_header Host api.example.com;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Authorization $http_authorization;
    proxy_ssl_server_name on;
    proxy_http_version 1.1;
}
```

保存后点击 **重载配置** 或重启 Nginx。

### 步骤 5：开启 HTTPS

在宝塔站点设置中进入 **SSL**，申请 Let's Encrypt 证书或上传自己的证书。建议强制 HTTPS，避免令牌通过明文传输。

### 步骤 6：访问测试

打开：

```text
https://key.example.com
```

输入令牌后点击查询。正常情况下，请求链路为：

```text
浏览器 https://key.example.com/api/usage/token
  -> 宝塔 Nginx 反向代理
  -> https://api.example.com/api/usage/token/
```

### 宝塔常见问题

1. **查询返回 HTML 或 JSON 解析失败**  
   通常是 `/api/usage/token` 没有命中反代，而是被前端 `index.html` fallback 处理了。请确认 `location = /api/usage/token` 写在 `location /` 之前。

2. **401 或提示缺少 Authorization**  
   请确认 Nginx 配置中保留了：

   ```nginx
   proxy_set_header Authorization $http_authorization;
   ```

3. **上游证书或域名错误**  
   请确认 `proxy_pass` 与 `proxy_set_header Host` 使用的是你的真实上游域名。

## 五、普通静态站点部署

如果你只把 `dist/` 上传到 GitHub Pages、对象存储、普通 CDN 等纯静态平台，需要注意：

- 纯静态平台不能运行 `api/usage/token.js`。
- `/api/usage/token` 不会自动代理到上游。
- 你需要额外准备后端代理、Cloudflare Workers、Netlify Functions，或使用平台提供的 Rewrite / Function 能力。

临时调试时可以设置：

```env
VITE_API_BASE=https://api.example.com
```

这样浏览器会直接请求上游接口，但这要求上游允许 CORS。生产环境更推荐同源代理方式。

## 六、使用说明

1. 打开部署后的网站。
2. 输入 `sk-xxxxxxxxxxxxxxxx` 类型令牌。
3. 点击 **开始查询**。
4. 页面会展示：
   - 剩余美元额度
   - 总美元额度
   - 已使用美元额度
   - 令牌名称
   - 过期时间
   - 模型限制
5. 如需排查接口返回内容，可以点击 **复制 JSON**。

## 七、API 约定

前端请求：

```http
GET /api/usage/token HTTP/1.1
Authorization: Bearer sk-xxxxxxxxxxxxxxxx
```

默认上游请求：

```http
GET https://api.example.com/api/usage/token/ HTTP/1.1
Authorization: Bearer sk-xxxxxxxxxxxxxxxx
```

示例响应：

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

默认换算规则：

```text
500000 quota = 1 USD
```

如需修改，请在构建前设置：

```env
VITE_QUOTA_PER_USD=你的换算比例
```

## 八、项目结构

```text
.
├── api/usage/token.js      # Vercel Serverless API 代理
├── public/                 # 静态资源
├── src/App.jsx             # 页面 UI、查询逻辑、数据格式化
├── src/index.css           # 页面样式
├── src/index.jsx           # React 挂载入口
├── .env.example            # 环境变量示例
├── Dockerfile              # Docker + Nginx 部署配置
├── vercel.json             # Vercel 配置
└── vite.config.js          # Vite 配置与本地代理
```

## License

MIT