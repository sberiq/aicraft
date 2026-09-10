FROM node:22-alpine AS build

WORKDIR /workspace
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY services/controller ./services/controller
RUN npm install --workspace services/controller
RUN npm run build --workspace services/controller

FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /workspace/services/controller/dist ./dist
COPY --from=build /workspace/services/controller/package.json ./package.json
COPY --from=build /workspace/node_modules ./node_modules

EXPOSE 3000
CMD ["node", "dist/index.js"]
