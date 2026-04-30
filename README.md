# 部署说明

## 一、准备工作

- 准备好你的 NewAPI / OneAPI 上游地址，例如：`https://api.example.com`。
- 默认令牌查询接口为：`/api/usage/token/`。
- 前端实际请求地址为：`/api/usage/token`。
- 如果使用静态网站部署，必须配置反向代理，否则查询接口会被前端页面拦截或出现跨域问题。
- 建议开启 HTTPS，避免令牌通过明文传输。

---

## 二、1Panel 部署

### 1. 准备工作

- 服务器已安装 1Panel，并且可以正常登录面板。
- 已将域名解析到服务器 IP；如果不使用域名，也可以直接使用服务器 IP 访问。
- 本地电脑或服务器已安装 Node.js，用于构建前端静态文件。
- 已准备好 NewAPI / OneAPI 上游地址，例如：`https://api.example.com`。

### 2. 构建前端文件

在本地电脑或服务器执行：

```bash
git clone https://github.com/JoneMacke/check-api-tool.git
cd check-api-tool
npm install
npm run build
```

构建完成后，项目根目录会生成：

```text
dist/
```

后续只需要上传 `dist` 目录里面的所有内容，不需要上传整个 `dist` 文件夹。

### 3. 创建静态网站

1. 登录 1Panel 面板。
2. 点击左侧 **网站** -> **创建网站**。
3. 网站类型选择 **静态网站**。
4. 填写基础信息：
   - **主域名**：填写已解析的域名，例如 `api-check.example.com`；如果不使用域名，可填写服务器 IP。
   - **代号**：自定义，例如 `check-api-tool`，仅用于面板内区分。
   - **运行环境**：默认选择 OpenResty 即可。
5. 点击 **创建**。

### 4. 上传前端文件

1. 进入刚创建的网站。
2. 点击顶部 **文件** 选项卡。
3. 删除网站根目录下的默认文件，例如 `index.html`、`readme.txt` 等。
4. 上传本地 `dist/` 目录中的所有内容到网站根目录。

上传完成后，网站根目录应直接看到 `index.html`、`assets/` 等文件，而不是看到一个 `dist` 文件夹。

### 5. 配置反向代理

进入网站详情页：

```text
配置 -> 配置文件
```

在 `server { ... }` 代码块中加入以下配置，并放在 `location /` 前面。

将 `api.example.com` 替换为你的真实上游域名。

```nginx
# 令牌查询接口：必须放在 location / 前面，避免被前端路由拦截
location = /api/usage/token {
    proxy_pass https://api.example.com/api/usage/token/;
    proxy_set_header Host api.example.com;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Authorization $http_authorization;
    proxy_ssl_server_name on;
    proxy_http_version 1.1;
}

# 其他 /api/ 请求，可选
location /api/ {
    proxy_pass https://api.example.com;
    proxy_set_header Host api.example.com;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Authorization $http_authorization;
    proxy_ssl_server_name on;
    proxy_http_version 1.1;
}

# 前端路由兼容
location / {
    try_files $uri $uri/ /index.html;
}
```

保存后点击 **重载配置**，或重启 OpenResty/Nginx。

### 6. 开启 HTTPS

1. 进入网站详情页，点击顶部 **SSL** 选项卡。
2. 选择申请 Let's Encrypt 证书，或上传已有 SSL 证书。
3. 开启 **强制 HTTPS**。
4. 保存配置。

### 7. 部署测试

打开浏览器访问：

```text
https://api-check.example.com
```

如果未开启 HTTPS，则访问：

```text
http://服务器IP
```

输入 API Token 后点击查询。正常请求链路为：

```text
浏览器 /api/usage/token
  -> 1Panel OpenResty/Nginx 反向代理
  -> https://api.example.com/api/usage/token/
```

---

## 三、Vercel 部署

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
UPSTREAM_API_BASE=https://api.example.com
```

可选添加：

```env
# 如果你的令牌查询接口不是 /api/usage/token/，可直接指定完整地址
UPSTREAM_TOKEN_USAGE_URL=https://api.example.com/api/usage/token/

# 页面右上角控制台地址，留空则不显示
VITE_CONSOLE_URL=https://console.example.com

# 额度换算比例，默认 500000 quota = 1 USD
VITE_QUOTA_PER_USD=500000
```

### 4. 重新部署

环境变量配置完成后，点击 **Redeploy**。

部署完成后访问 Vercel 分配的域名即可。

请求链路为：

```text
浏览器 /api/usage/token
  -> Vercel Function api/usage/token.js
  -> https://api.example.com/api/usage/token/
```

---

## 四、Docker 部署

### 1. 修改上游地址

项目提供 `Dockerfile`，容器内使用 Nginx 托管前端并反向代理接口。

部署前需要将 `Dockerfile` 中的示例域名 `api.example.com` 替换为你的真实上游域名：

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

### 2. 构建镜像

```bash
docker build -t check-api-tool .
```

如果需要设置前端构建变量，可在构建镜像前创建 `.env.production`：

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

如果需要绑定域名，可以在服务器外层 Nginx、1Panel、宝塔面板等工具中，将域名反向代理到：

```text
http://127.0.0.1:8080
```

---

## 五、宝塔面板部署

### 1. 构建前端文件

在本地电脑或服务器执行：

```bash
git clone https://github.com/JoneMacke/check-api-tool.git
cd check-api-tool
npm install
npm run build
```

构建完成后，将 `dist/` 目录里的所有内容上传到宝塔站点根目录。

### 2. 创建静态站点

1. 登录宝塔面板。
2. 进入 **网站** -> **添加站点**。
3. 填写域名，例如 `api-check.example.com`。
4. PHP 版本选择 **纯静态**。
5. 创建站点。

### 3. 上传前端文件

进入站点根目录，例如：

```text
/www/wwwroot/api-check.example.com/
```

删除默认文件，然后上传 `dist/` 目录中的所有内容。

注意：根目录应直接包含 `index.html`、`assets/` 等文件，不要上传整个 `dist` 文件夹。

### 4. 配置反向代理

进入：

```text
网站 -> 对应站点 -> 配置文件
```

在 `server { ... }` 中加入以下配置，并放在 `location /` 前面。

将 `api.example.com` 替换为你的真实上游域名。

```nginx
# 令牌查询接口：必须放在 location / 前面，避免被前端路由拦截
location = /api/usage/token {
    proxy_pass https://api.example.com/api/usage/token/;
    proxy_set_header Host api.example.com;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Authorization $http_authorization;
    proxy_ssl_server_name on;
    proxy_http_version 1.1;
}

# 其他 /api/ 请求，可选
location /api/ {
    proxy_pass https://api.example.com;
    proxy_set_header Host api.example.com;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Authorization $http_authorization;
    proxy_ssl_server_name on;
    proxy_http_version 1.1;
}

# 前端路由兼容
location / {
    try_files $uri $uri/ /index.html;
}
```

保存后点击 **重载配置** 或重启 Nginx。

### 5. 开启 HTTPS

进入站点设置中的 **SSL** 页面，申请 Let's Encrypt 证书或上传已有证书。

建议开启强制 HTTPS。

### 6. 部署测试

打开：

```text
https://api-check.example.com
```

输入 API Token 后点击查询。正常请求链路为：

```text
浏览器 /api/usage/token
  -> 宝塔 Nginx 反向代理
  -> https://api.example.com/api/usage/token/
```

---

## 六、常见问题

### 1. 查询返回 HTML 或提示 JSON 解析失败

原因：`/api/usage/token` 没有命中反向代理，而是被 `location /` 返回了前端页面。

解决方法：确认以下配置写在 `location /` 前面，并保存后重载 Nginx/OpenResty。

```nginx
location = /api/usage/token { ... }
```

### 2. 提示 401 或缺少 Authorization

原因：Nginx/OpenResty 没有把 Authorization 请求头传给上游。

解决方法：确认反向代理配置中包含：

```nginx
proxy_set_header Authorization $http_authorization;
```

### 3. 上游接口访问失败

请确认：

1. `proxy_pass` 使用的是你的真实上游地址。
2. `proxy_set_header Host` 填写的是上游域名，不要带 `https://`。
3. 如果上游令牌查询接口不是 `/api/usage/token/`，请将 `proxy_pass` 改成实际路径。
4. 如果上游是 HTTPS，请保留：

```nginx
proxy_ssl_server_name on;
```
