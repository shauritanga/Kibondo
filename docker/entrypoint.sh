#!/bin/sh
set -e

cd /var/www/html

if [ -z "$APP_KEY" ]; then
    echo "ERROR: APP_KEY is not set. Add APP_KEY to docker-compose or your environment." >&2
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

php artisan migrate --force --no-interaction

if [ "${RUN_SEED:-false}" = "true" ]; then
    php artisan db:seed --force --no-interaction
fi

exec "$@"
