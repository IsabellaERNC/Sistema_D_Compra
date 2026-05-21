# ============================================
# BUILD STAGE — Compilar assets estáticos
# ============================================
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ============================================
# SERVE STAGE — Nginx con SPA routing
# ============================================
FROM nginx:stable-alpine

# Copiar assets buildheados
COPY --from=build /app/dist /usr/share/nginx/html

# Configuracion SPA: todas las rutas → index.html
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \

}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
