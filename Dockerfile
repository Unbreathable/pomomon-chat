FROM oven/bun:1 AS base
WORKDIR /usr/src/app

FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

ENV NODE_ENV=production
RUN bun run build

FROM base AS release

# Install fontconfig + JetBrains Mono for fallback avatar generation
RUN apt-get update && apt-get install -y --no-install-recommends fontconfig && rm -rf /var/lib/apt/lists/*
COPY --from=install /temp/prod/node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2 /usr/share/fonts/truetype/jetbrains-mono.woff2
RUN fc-cache -f

# App files
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /usr/src/app/public ./dist/public/
COPY --from=prerelease /usr/src/app/dist ./dist
COPY --from=prerelease /usr/src/app/package.json .
COPY --from=prerelease /usr/src/app/src/backend/migrate.ts ./migrate.ts
COPY --from=prerelease /usr/src/app/scripts/entrypoint.sh ./entrypoint.sh
RUN ln -s ./dist/public ./public && chmod +x ./entrypoint.sh

USER bun
EXPOSE 3000/tcp
ENTRYPOINT ["./entrypoint.sh"]
