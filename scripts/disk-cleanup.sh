#!/usr/bin/env bash
# Free disk space safely. Doesn't touch our named volumes (pgdata,
# redisdata, uploads, certbot). Run weekly via cron.
#
# Cron: 0 4 * * 0 /opt/chefai/scripts/disk-cleanup.sh >> /var/log/chefai-cleanup.log 2>&1

set -euo pipefail

echo "[$(date)] disk-cleanup: starting"
df -h /

# Remove dangling images, stopped containers, unused networks (NOT volumes)
docker system prune -af

# Remove buildkit cache (frequently grows to GBs)
docker builder prune -af --filter "until=72h"

# Truncate huge container log files (>100MB) — log rotation in compose now
# caps these to 30MB total per service, but be defensive on existing files.
find /var/lib/docker/containers/ -name "*-json.log" -size +100M \
  -exec sh -c 'echo "truncating: $1"; : > "$1"' _ {} \; 2>/dev/null || true

echo "[$(date)] disk-cleanup: done"
df -h /
