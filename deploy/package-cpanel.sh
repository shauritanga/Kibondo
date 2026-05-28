#!/usr/bin/env bash
# Build Kibondo locally for cPanel and create a zip for manual upload.
# Produces: deploy/kibondo-cpanel-YYYYMMDD-HHMM.zip
#
# Usage:
#   ./deploy/package-cpanel.sh
#   ./deploy/package-cpanel.sh --skip-build   # zip only (vendor/ + public/build/ already built)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SKIP_BUILD=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build) SKIP_BUILD=true; shift ;;
    -h|--help)
      echo "Usage: $0 [--skip-build]"
      exit 0
      ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ "$SKIP_BUILD" == false ]]; then
  echo "==> Composer (PHP 8.3, production)..."
  if command -v docker >/dev/null 2>&1; then
    docker run --rm -v "$ROOT:/app" -w /app composer:2 \
      sh -c "composer config platform.php 8.3.31 && composer install --no-dev --optimize-autoloader --no-interaction"
  elif command -v composer >/dev/null 2>&1; then
    composer config platform.php 8.3.31
    composer install --no-dev --optimize-autoloader --no-interaction
  else
    echo "error: install Docker or Composer locally" >&2
    exit 1
  fi

  echo "==> npm install + vite build..."
  export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}"
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
  npm run build
fi

if [[ ! -d vendor ]] || [[ ! -f vendor/autoload.php ]]; then
  echo "error: vendor/ missing — run without --skip-build" >&2
  exit 1
fi

if [[ ! -d public/build ]] || [[ ! -f public/build/manifest.json ]]; then
  echo "error: public/build/ missing — run npm run build" >&2
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M)"
OUT_NAME="kibondo-cpanel-${STAMP}.zip"
OUT_PATH="$ROOT/deploy/$OUT_NAME"
STAGING="$(mktemp -d)"
trap 'rm -rf "$STAGING"' EXIT

PKG="$STAGING/kibondo"
mkdir -p "$PKG"

echo "==> Staging files..."
rsync -a \
  --exclude '.git' \
  --exclude '.gitignore' \
  --exclude 'node_modules' \
  --exclude '.env' \
  --exclude '.env.production' \
  --exclude '.env.backup' \
  --exclude '.env.testing' \
  --exclude '.env.docker*' \
  --exclude 'firebase-credentials.json' \
  --exclude '/storage/logs/*' \
  --exclude '/storage/framework/cache/data/*' \
  --exclude '/storage/framework/sessions/*' \
  --exclude '/storage/framework/views/*' \
  --exclude '/storage/pail' \
  --exclude '/bootstrap/cache/*.php' \
  --exclude '.phpunit.cache' \
  --exclude '.phpunit.result.cache' \
  --exclude 'tests' \
  --exclude 'coverage' \
  --exclude '.cursor' \
  --exclude '.idea' \
  --exclude '.vscode' \
  --exclude '.codex' \
  --exclude '.nova' \
  --exclude '.zed' \
  --exclude 'Homestead.yaml' \
  --exclude 'Homestead.json' \
  --exclude 'docker-compose*.yml' \
  --exclude 'Dockerfile*' \
  --exclude '.docker' \
  --exclude 'deploy/kibondo_database*.sql' \
  --exclude 'deploy/kibondo-cpanel*.zip' \
  --exclude 'database/seeders/AdminUserSeeder.php' \
  --exclude 'public/hot' \
  --exclude 'public/storage' \
  --exclude '*.log' \
  --exclude '.DS_Store' \
  "$ROOT/" "$PKG/"

# Keep Laravel writable dirs (empty)
mkdir -p "$PKG/storage/logs" \
         "$PKG/storage/framework/cache/data" \
         "$PKG/storage/framework/sessions" \
         "$PKG/storage/framework/views" \
         "$PKG/bootstrap/cache"
touch "$PKG/storage/logs/.gitkeep"

echo "==> Creating zip..."
mkdir -p "$ROOT/deploy"
(
  cd "$STAGING"
  zip -rq "$OUT_PATH" kibondo
)

SIZE="$(du -h "$OUT_PATH" | cut -f1)"
echo ""
echo "Done: $OUT_PATH ($SIZE)"
echo ""
echo "Upload via cPanel File Manager or SFTP, then on server:"
echo "  1. Backup existing app + .env"
echo "  2. Extract zip into /home/kibondogreenfarm/Kibondo (merge/replace)"
echo "  3. Restore .env if overwritten"
echo "  4. See deploy/CPANEL.md → \"Upload zip from your PC\""
