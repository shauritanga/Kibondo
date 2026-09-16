#!/bin/sh
set -e

cd /var/www/html

if [ -z "$APP_KEY" ]; then
    echo "ERROR: APP_KEY must be set in production." >&2
    exit 1
fi

# Named volumes overlay the image's storage/cache dirs and start empty.
mkdir -p \
    storage/app/public \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
chmod -R ug+rwx storage bootstrap/cache

# Host .env files use localhost; that is the web container here, not Postgres.
case "${DB_HOST:-}" in
    localhost|127.0.0.1|::1|"")
        echo "DB_HOST=${DB_HOST:-empty} is not reachable in Docker; using db"
        export DB_HOST=db
        export DB_PORT="${DB_PORT:-5432}"
        ;;
esac
case "${DB_URL:-}${DATABASE_URL:-}" in
    *localhost*|*127.0.0.1*)
        unset DB_URL DATABASE_URL
        ;;
esac

echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT:-5432}..."
i=0
until php -r "
    \$dsn = 'pgsql:host=' . getenv('DB_HOST')
        . ';port=' . (getenv('DB_PORT') ?: '5432')
        . ';dbname=' . getenv('DB_DATABASE')
        . ';sslmode=' . (getenv('DB_SSLMODE') ?: 'prefer');
    try {
        new PDO(\$dsn, getenv('DB_USERNAME'), getenv('DB_PASSWORD'));
        exit(0);
    } catch (Throwable \$e) {
        fwrite(STDERR, \$e->getMessage() . PHP_EOL);
        exit(1);
    }
"; do
    i=$((i + 1))
    if [ "$i" -ge 60 ]; then
        echo "ERROR: could not connect to PostgreSQL at ${DB_HOST}:${DB_PORT:-5432} after 60s" >&2
        exit 1
    fi
    sleep 1
done

if [ "${RUN_MIGRATE:-true}" = "true" ]; then
    php artisan migrate --force --no-interaction
fi

if [ "${RUN_OPTIMIZE:-true}" = "true" ] && [ "${APP_ENV:-production}" = "production" ]; then
    php artisan config:cache --no-interaction
    php artisan route:cache --no-interaction || echo "route:cache skipped (closure routes)"
    php artisan view:cache --no-interaction
fi

exec "$@"
