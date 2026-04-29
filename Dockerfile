# ---------- Build stage ----------
FROM node:20-alpine AS builder

WORKDIR /app

# 仅拷贝依赖描述以利用层缓存
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# 拷贝源码并构建
COPY . .
RUN npm run build

# ---------- Runtime stage ----------
FROM nginx:1.27-alpine

# 复制 Vite 构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 单页应用 history 路由的 fallback
RUN printf 'server {\n\
    listen 80;\n\
    server_name _;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
