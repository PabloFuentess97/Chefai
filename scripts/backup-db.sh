#!/usr/bin/env bash
# Daily Postgres backup — keep last 14 days.
# Cron: 0 3 * * * /opt/chefai/scripts/backup-db.sh

set -euo pipefail

DEST="${BACKUP_DIR:-/opt/backups}"
COMPOSE_FILE="${COMPOSE_FILE:-/opt/chefai/docker/docker-compose.yml}"
ENV_FILE="${ENV_FILE:-/opt/chefai/.env.production}"

mkdir -p "$DEST"
DATE=$(date +%F-%H%M)

# Read POSTGRES_USER / DB from env file
if [ -f "$ENV_FILE" ]; then
  set -o allexport
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +o allexport
fi

POSTGRES_USER=${POSTGRES_USER:-chefai}
POSTGRES_DB=${POSTGRES_DB:-chefai}

echo "Backing up ${POSTGRES_DB} to ${DEST}/chefai-${DATE}.sql.gz"
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" | gzip > "$DEST/chefai-$DATE.sql.gz"

# Keep only the last 14 days
find "$DEST" -name 'chefai-*.sql.gz' -mtime +14 -delete

echo "Backup complete."
