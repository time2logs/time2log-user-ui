FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN bun install

COPY . .
RUN bun run build

FROM nginx:stable-alpine
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
