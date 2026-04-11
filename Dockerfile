FROM oven/bun:1.3.10-alpine

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY src ./src

ENV BUN_CONFIG_DNS_RESULT_ORDER=ipv4first

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
