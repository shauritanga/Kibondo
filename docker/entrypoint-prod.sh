#!/bin/sh
set -e

cd /var/www/html

if [ -z "$APP_KEY" ]; then
    echo "ERROR: APP_KEY must be set in production." >&2
    exit 1
fi

echo "Waiting for PostgreSQL..."
until php -r "
    try {
        new PDO(
            'pgsql:host=' . getenv('DB_HOST') . ';port=' . (getenv('DB_PORT') ?: '5432') . ';dbname=' . getenv('DB_DATABASE'),
            getenv('DB_USERNAME'),
            getenv('DB_PASSWORD')
        );
        exit(0);
    } catch (Throwable \$e) {
        exit(1);
    }
" 2>/dev/null; do
    sleep 1
done

if [ "${RUN_MIGRATE:-true}" = "true" ]; then
    php artisan migrate --force --no-interaction
fi

if [ "${RUN_OPTIMIZE:-true}" = "true" ] && [ "${APP_ENV:-production}" = "production" ]; then
    php artisan config:cache --no-interaction
    php artisan route:cache --no-interaction
    php artisan view:cache --no-interaction
fi

exec "$@"
