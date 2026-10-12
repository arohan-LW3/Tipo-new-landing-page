# Production image for DigitalOcean (App Platform or any Docker host).
# Builds the website, then runs the Node server that serves it plus /api.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server ./server
# File storage is only used when no DATABASE_URL is set (e.g. a plain Docker
# host); mount a volume at /app/data to keep it.
ENV DATA_DIR=/app/data
EXPOSE 8080
USER node
CMD ["node", "server/index.js"]
