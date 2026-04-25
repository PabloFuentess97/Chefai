#!/usr/bin/env bash
# One-time bootstrap of Let's Encrypt certs for chefai.
# Usage: bash docker/init-letsencrypt.sh

set -euo pipefail

if [ -z "${DOMAIN:-}" ]; then
  echo "ERROR: set DOMAIN env var (e.g. chefai.app)" >&2
  exit 1
fi
if [ -z "${EMAIL:-}" ]; then
  echo "ERROR: set EMAIL env var (e.g. you@chefai.app)" >&2
  exit 1
fi

# Resolve repo root unambiguously so this works regardless of where the
# script is invoked from.
PROJECT_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env.production"
COMPOSE_FILE="${PROJECT_ROOT}/docker/docker-compose.yml"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: .env.production not found at $ENV_FILE" >&2
  echo "       Create it from .env.example and try again." >&2
  exit 1
fi

cd "$PROJECT_ROOT"

COMPOSE="docker compose -f $COMPOSE_FILE --env-file $ENV_FILE"

echo "1) Replacing DOMAIN in nginx.conf"
sed -i.bak "s/DOMAIN/${DOMAIN}/g" docker/nginx.conf

echo "2) Creating dummy certificate so nginx can start"
$COMPOSE run --rm --entrypoint "\
  sh -c 'mkdir -p /etc/letsencrypt/live/${DOMAIN} && \
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/${DOMAIN}/privkey.pem \
    -out /etc/letsencrypt/live/${DOMAIN}/fullchain.pem \
    -subj /CN=${DOMAIN}'" certbot

echo "3) Starting nginx"
$COMPOSE up -d nginx

echo "4) Removing dummy certificate"
$COMPOSE run --rm --entrypoint "\
  rm -rf /etc/letsencrypt/live/${DOMAIN} \
  /etc/letsencrypt/archive/${DOMAIN} \
  /etc/letsencrypt/renewal/${DOMAIN}.conf" certbot

echo "5) Requesting real certificate from Let's Encrypt"
$COMPOSE run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    --email ${EMAIL} -d ${DOMAIN} -d www.${DOMAIN} \
    --rsa-key-size 4096 --agree-tos --force-renewal --non-interactive" certbot

echo "6) Reloading nginx"
$COMPOSE exec nginx nginx -s reload

echo "Done. Visit https://${DOMAIN}"
