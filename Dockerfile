FROM node:22-slim

RUN corepack enable

WORKDIR /app

# Install the full workspace (devDependencies included: esbuild, drizzle-kit,
# typescript are needed to build and to run migrations in deploy/entrypoint.sh).
# Explicit NODE_ENV=development so an exported NODE_ENV=production in the build
# shell cannot strip devDeps. Runtime sets NODE_ENV=production via compose.
ENV NODE_ENV=development
COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @kairos/api --filter @kairos/web build

EXPOSE 4000

CMD ["sh", "deploy/entrypoint.sh"]
