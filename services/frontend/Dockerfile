FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_FORCE_LIVE_CONTESTS=true
ENV VITE_FORCE_LIVE_CONTESTS=${VITE_FORCE_LIVE_CONTESTS}

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY conf/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
