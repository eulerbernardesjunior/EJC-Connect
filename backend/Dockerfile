# syntax=docker/dockerfile:1.7
FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    chromium \
    postgresql-client \
    ca-certificates \
    fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROME_BIN=/usr/bin/chromium

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh && mkdir -p uploads

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
