# 部署说明

## 一、Vercel 部署

### 1. 导入项目

1. 将项目推送到 GitHub。
2. 登录 Vercel 控制台。
3. 点击 **Add New Project**，选择当前仓库导入。
4. Framework Preset 可保持自动识别，或选择 **Vite**。

### 2. 构建配置

项目已提供 `vercel.json`，默认配置如下：

| 配置项 | 值 |
| --- | --- |
| Install Command | `npm install` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

正常情况下无需手动修改。

### 3. 环境变量

进入 Vercel 项目：

```text
Project Settings -> Environment Variables
```

至少添加：

```env
UPSTREAM_API_BASE=https://your-newapi.example.com
```

可选添加：

```env
# 如果你的令牌查询接口不是 /api/usage/token/，可直接指定完整地址
UPSTREAM_TOKEN_USAGE_URL=https://your-newapi.example.com/api/usage/token/

# 页面右上角控制台地址，留空则不显示
VITE_CONSOLE_URL=https://console.example.com

# 额度换算比例，默认 500000 quota = 1 USD
VITE_QUOTA_PER_USD=500000
```

### 4. 部署与访问

环境变量配置完成后，点击 **Redeploy** 重新部署。

部署完成后访问 Vercel 分配的域名即可。

接口请求链路：

```text
浏览器 /api/usage/token
  -> Vercel Function api/usage/token.js
  -> 上游 https://your-newapi.example.com/api/usage/token/
```

---

## 二、Docker 部署

### 1. 修改上游 API 地址

项目提供 `Dockerfile`，容器内使用 Nginx 托管前端并反代接口。

部署前请将 `Dockerfile` 中的示例域名替换为你的上游域名：

```nginx
location = /api/usage/token {
    proxy_pass https://api.example.com/api/usage/token/;
    proxy_set_header Host api.example.com;
}

location /api/ {
    proxy_pass https://api.example.com;
    proxy_set_header Host api.example.com;
}
```

例如将 `api.example.com` 改为你的 NewAPI / OneAPI 域名。

### 2. 构建镜像

```bash
docker build -t check-api-tool .
```

如果需要在构建时设置前端环境变量，可在构建前写入 `.env.production`：

```env
VITE_CONSOLE_URL=https://console.example.com
VITE_QUOTA_PER_USD=500000
```

### 3. 启动容器

```bash
docker run -d \
  --name check-api-tool \
  -p 8080:80 \
  --restart unless-stopped \
  check-api-tool
```

访问：

```text
http://服务器IP:8080
```

### 4. 使用域名访问，可选

如果需要使用域名，可在服务器外层 Nginx、宝塔、1Panel、Nginx Proxy Manager 等面板中，将域名反向代理到：

```text
http://127.0.0.1:8080
```

建议同时开启 HTTPS。

---

## 三、宝塔面板部署

### 1. 构建前端文件

在本地或服务器执行：

```bash
npm install
npm run build
```

构建完成后会生成：

```text
dist/
```

### 2. 创建静态站点

1. 登录宝塔面板。
2. 进入 **网站** -> **添加站点**。
3. 填写你的域名，例如：

   ```text
   key.example.com
   ```

4. PHP 版本选择 **纯静态**。
5. 创建站点。

### 3. 上传文件

将 `dist/` 目录里的所有文件上传到站点根目录，例如：

```text
/www/wwwroot/key.example.com/
```

注意：上传的是 `dist` 里面的内容，不是上传整个 `dist` 文件夹。

### 4. 配置 Nginx 反向代理

进入：

```text
网站 -> 对应站点 -> 配置文件
```

在 `server { ... }` 中加入以下配置，并把 `your-newapi.example.com` 替换为你的上游 NewAPI / OneAPI 域名：

```nginx
# 令牌额度查询接口
location = /api/usage/token {
    proxy_pass https://your-newapi.example.com/api/usage/token/;
    proxy_set_header Host your-newapi.example.com;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Authorization $http_authorization;
    proxy_ssl_server_name on;
    proxy_http_version 1.1;
}

# 其他 /api/ 请求，可选
location /api/ {
    proxy_pass https://your-newapi.example.com;
    proxy_set_header Host your-newapi.example.com;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Authorization $http_authorization;
    proxy_ssl_server_name on;
    proxy_http_version 1.1;
}

# 前端路由 fallback
location / {
    try_files $uri $uri/ /index.html;
}
```

保存后点击 **重载配置** 或重启 Nginx。

### 5. 开启 HTTPS

进入站点设置的 **SSL** 页面，申请 Let's Encrypt 证书或上传已有证书。

建议开启强制 HTTPS，避免令牌通过明文传输。

### 6. 访问测试

打开：

```text
https://key.example.com
```

输入令牌后点击查询。

请求链路：

```text
浏览器 https://key.example.com/api/usage/token
  -> 宝塔 Nginx 反向代理
  -> https://your-newapi.example.com/api/usage/token/
```

### 7. 常见问题

#### 查询返回 HTML 或提示 JSON 解析失败

通常是 `/api/usage/token` 没有命中反向代理，而是被 `location /` 返回了前端页面。

请确认：

```nginx
location = /api/usage/token { ... }
```

写在：

```nginx
location / { ... }
```

之前。

#### 401 或提示缺少 Authorization

请确认 Nginx 配置中保留了：

```nginx
proxy_set_header Authorization $http_authorization;
```

#### 上游接口访问失败

请确认：

1. `proxy_pass` 使用的是你的真实上游地址。
2. `proxy_set_header Host` 与上游域名一致。
3. 上游接口路径是否为 `/api/usage/token/`，如果不是，请改成实际路径。