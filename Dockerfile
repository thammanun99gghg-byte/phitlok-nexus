# PHITLOK NEXUS — production image (node:sqlite is built into Node 22.13+, no native build needed)
FROM node:24-alpine

ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/app/data

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server.js ./
COPY src ./src
COPY scripts ./scripts
COPY public ./public

RUN mkdir -p /app/data && chown -R node:node /app/data
USER node

VOLUME ["/app/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "--disable-warning=ExperimentalWarning", "server.js"]
