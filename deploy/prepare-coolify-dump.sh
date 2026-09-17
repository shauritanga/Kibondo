#!/usr/bin/env bash
# Rewrite a cPanel pg_dump so it can load into Coolify Compose Postgres
# (user kibondo, database kibondo_db, Postgres 13).
#
# Usage:
#   ./deploy/prepare-coolify-dump.sh "/path/to/dump.sql" > /tmp/kibondo-coolify.sql
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 dump.sql" >&2
  exit 1
fi

sed \
  -e '/^\\restrict/d' \
  -e '/^\\unrestrict/d' \
  -e '/^CREATE SCHEMA public/d' \
  -e '/^ALTER SCHEMA public OWNER/d' \
  -e '/^COMMENT ON SCHEMA public/d' \
  -e '/^GRANT /d' \
  -e '/^ALTER DEFAULT PRIVILEGES /d' \
  -e 's/OWNER TO kibondogreenfarm_admin/OWNER TO kibondo/g' \
  -e 's/OWNER TO kibondogreenfarm_db/OWNER TO kibondo/g' \
  -e 's/OWNER TO kibondogreenfarm/OWNER TO kibondo/g' \
  -e 's/OWNER TO postgres/OWNER TO kibondo/g' \
  "$1"
