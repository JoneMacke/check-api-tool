# --- build stage ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

# --- runtime stage ---
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
RUN rm /etc/nginx/conf.d/default.conf
COPY <<'EOF' /etc/nginx/conf.d/app.conf
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # 反代上游 API，规避浏览器跨域。
    # 前端请求无尾斜杠 /api/usage/token，这里显式映射到上游有尾斜杠路径。
    location = /api/usage/token {
        proxy_pass https://api.example.com/api/usage/token/;
        proxy_set_header Host api.example.com;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Authorization $http_authorization;
        proxy_ssl_server_name on;
        proxy_http_version 1.1;
    }

    # 其他 /api/ 请求保留通用反代
    location /api/ {
        proxy_pass https://api.example.com;
        proxy_set_header Host api.example.com;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Authorization $http_authorization;
        proxy_ssl_server_name on;
        proxy_http_version 1.1;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
