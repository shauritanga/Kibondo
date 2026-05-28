#!/usr/bin/env bash
# Export a phpPgAdmin-friendly SQL dump from Docker PostgreSQL 13 (matches cPanel PG 13).
# pg_trgm is omitted by default — most cPanel hosts do not ship that extension.
# Usage: ./deploy/export-database-cpanel.sh [--with-trgm] [output.sql]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="$ROOT/docker-compose.dev.yml"
WITH_TRGM=false
OUT="$ROOT/deploy/kibondo_database_cpanel.sql"

compose() {
  docker compose -f "$COMPOSE_FILE" "$@"
}

filter_trgm() {
  sed \
    -e '/CREATE EXTENSION IF NOT EXISTS pg_trgm/d' \
    -e '/DROP EXTENSION IF EXISTS pg_trgm/d' \
    -e '/COMMENT ON EXTENSION pg_trgm/d' \
    -e '/CREATE INDEX sales_sale_number_trgm/d' \
    -e '/-- Name: pg_trgm/d' \
    -e '/-- Name: EXTENSION pg_trgm/d' \
    -e '/-- Name: sales_sale_number_trgm/d' \
    -e '/text similarity measurement and index searching/d'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --with-trgm) WITH_TRGM=true; shift ;;
    --no-trgm) shift ;; # legacy flag; default is already without trgm
    -h|--help)
      echo "Usage: $0 [--with-trgm] [output.sql]"
      exit 0
      ;;
    *) OUT="$1"; shift ;;
  esac
done

cd "$ROOT"

if ! compose ps --status running db 2>/dev/null | grep -q db; then
  echo "Starting PostgreSQL 13..."
  compose up -d db
  sleep 5
fi

echo "Running migrations..."
compose up -d app
compose exec -T app php artisan migrate --force

echo "Exporting to $OUT ..."
compose exec -T db pg_dump -U kibondo -d kibondo_db \
  --no-owner --no-acl --clean --if-exists --inserts \
  | sed '/^\\restrict/d;/^\\unrestrict/d;/^SET /d;/^SELECT pg_catalog\.set_config/d' \
  | if $WITH_TRGM; then cat; else filter_trgm; fi > "$OUT"

echo "Done. Import $OUT via cPanel phpPgAdmin (PostgreSQL 13)."
if ! $WITH_TRGM; then
  echo "pg_trgm omitted (typical for cPanel). Sale search still works, slightly slower."
else
  echo "Dump includes pg_trgm — import only if your host provides that extension."
fi
