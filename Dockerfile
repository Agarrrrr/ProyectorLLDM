FROM node:24-bookworm-slim AS lists
WORKDIR /build
COPY lista-oraciones/package*.json ./
RUN npm ci --no-audit --no-fund
COPY lista-oraciones/ ./
RUN npm run build

FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-impress fonts-liberation python3 python3-pymupdf \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY server-web.js ./
COPY src ./src
COPY public ./public
COPY data/factory ./data/factory
COPY --from=lists /build/dist ./lista-oraciones/dist
RUN mkdir /storage && chown node:node /storage
USER node
ENV PROYECTOR_STORAGE=/storage PROYECTOR_BIND=0.0.0.0 PYTHON_PATH=/usr/bin/python3
VOLUME ["/storage"]
EXPOSE 4000
CMD ["node", "server-web.js"]
