FROM node:22-alpine AS build

WORKDIR /workspace
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY apps/panel ./apps/panel
RUN npm install --workspace apps/panel
RUN npm run build --workspace apps/panel

FROM nginx:1.27-alpine

COPY --from=build /workspace/apps/panel/dist /usr/share/nginx/html
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
