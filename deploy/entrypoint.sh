#!/bin/sh
set -e

echo "Running database migrations..."
pnpm db:migrate

echo "Starting API..."
exec node apps/api/dist/index.cjs
