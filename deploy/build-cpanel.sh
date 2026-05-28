#!/usr/bin/env bash
# Build Kibondo for production on cPanel after `git pull`.
# Run from the app directory or set APP_ROOT.
set -euo pipefail

APP_ROOT="${APP_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
WEB_ROOT="${WEB_ROOT:-/home/kibondogreenfarm/public_html/store.kibondogreenfarm.co.tz}"
PHP="${PHP:-/opt/cpanel/ea-php83/root/usr/bin/php}"

cd "$APP_ROOT"

if [[ ! -f artisan ]]; then
  echo "error: artisan not found in APP_ROOT=$APP_ROOT" >&2
  exit 1
fi

if [[ ! -x "$PHP" ]]; then
  echo "error: PHP 8.3 not found at $PHP — set PHP= to ea-php83 path" >&2
  exit 1
fi

echo "==> PHP: $($PHP -v | head -1)"

# --- Node (cPanel: install via "Setup Node.js App" or ea-nodejs) ---
if [[ -z "${NODE:-}" ]] || [[ -z "${NPM:-}" ]]; then
  for dir in /opt/cpanel/ea-nodejs22 /opt/cpanel/ea-nodejs20 /opt/cpanel/ea-nodejs18; do
    if [[ -x "$dir/bin/node" ]]; then
      export PATH="$dir/bin:$PATH"
      break
    fi
  done
  NODE="$(command -v node || true)"
  NPM="$(command -v npm || true)"
fi

if [[ -z "${NODE:-}" ]] || [[ -z "${NPM:-}" ]]; then
  echo "error: node/npm not found. In cPanel: Software → Setup Node.js App (Node 20+), or:" >&2
  echo "  export PATH=/opt/cpanel/ea-nodejs22/bin:\$PATH" >&2
  exit 1
fi

NODE_MAJOR="$("$NODE" -p "process.versions.node.split('.')[0]")"
if [[ "$NODE_MAJOR" -lt 20 ]]; then
  echo "error: Node 20+ required (found $($NODE -v))" >&2
  exit 1
fi

echo "==> Node: $($NODE -v)"

# --- Composer (cPanel CLI often has allow_url_fopen=Off) ---
PHP_COMPOSER=("$PHP" -d allow_url_fopen=On)
COMPOSER_PHAR="$APP_ROOT/composer.phar"

ensure_composer_phar() {
  if [[ -f "$COMPOSER_PHAR" ]]; then
    return 0
  fi
  echo "==> Downloading composer.phar (curl — no allow_url_fopen needed)..."
  curl -fsSL -o "$COMPOSER_PHAR" https://getcomposer.org/download/latest-stable/composer.phar
  chmod +x "$COMPOSER_PHAR"
}

ensure_composer_phar
COMPOSER_CMD=("${PHP_COMPOSER[@]}" "$COMPOSER_PHAR")

echo "==> Composer: $("${COMPOSER_CMD[@]}" --version 2>/dev/null | head -1)"

echo "==> Composer install (production)..."
COMPOSER_ALLOW_SUPERUSER=1 "${COMPOSER_CMD[@]}" install --no-dev --optimize-autoloader --no-interaction

echo "==> npm ci + build..."
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=2048}"
"$NPM" ci
"$NPM" run build

if [[ ! -d public/build ]]; then
  echo "error: public/build missing after vite build" >&2
  exit 1
fi

# Split docroot: copy Vite manifest + assets to subdomain web root
if [[ -d "$WEB_ROOT" ]]; then
  echo "==> Sync public/build → $WEB_ROOT/build"
  mkdir -p "$WEB_ROOT/build"
  rsync -a --delete public/build/ "$WEB_ROOT/build/"

  for asset in favicon.svg icon-192.png apple-touch-icon.png manifest.json robots.txt; do
    if [[ -f "public/$asset" ]]; then
      cp -f "public/$asset" "$WEB_ROOT/$asset"
    fi
  done
else
  echo "warn: WEB_ROOT=$WEB_ROOT not found — skip copying build/ (using single public/ docroot?)"
fi

echo "==> Laravel caches..."
"$PHP" artisan config:clear
"$PHP" artisan route:clear
"$PHP" artisan view:clear

echo ""
echo "Done. Optional next steps:"
echo "  $PHP artisan migrate --force"
echo "  $PHP artisan mail:test you@example.com"
