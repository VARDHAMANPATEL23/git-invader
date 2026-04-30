FROM oven/bun:1
WORKDIR /app

COPY package.json ./
RUN bun install

COPY tsconfig.json ./
COPY src/ ./src/

ENTRYPOINT ["bun", "src/index.ts"]
