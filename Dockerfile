FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

RUN apk add --no-cache docker-cli

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY server ./server

RUN mkdir -p /backups /uploads/office

ENV NODE_ENV=production

EXPOSE 3050

CMD ["node", "--loader", "tsx", "server/index.ts"]
