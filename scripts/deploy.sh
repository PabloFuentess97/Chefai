#!/usr/bin/env bash
# Pull latest, rebuild, run migrations.
# Usage: bash scripts/deploy.sh

set -euo pipefail

cd "$(dirname "$0")/.."

echo "1) Pulling latest"
git pull --ff-only

echo "2) Building web image"
docker compose -f docker/docker-compose.yml --env-file .env.production build web

echo "3) Running migrations"
docker compose -f docker/docker-compose.yml --env-file .env.production run --rm migrate

echo "4) Restarting web"
docker compose -f docker/docker-compose.yml --env-file .env.production up -d web

echo "5) Reloading nginx"
docker compose -f docker/docker-compose.yml --env-file .env.production exec nginx nginx -s reload || true

echo "Deploy complete."
