# syntax=docker/dockerfile:1

# ─── Frontend assets ───────────────────────────────────────────────────────────
FROM node:22-alpine AS frontend

WORKDIR /app

COPY package.json ./
RUN npm install --ignore-scripts

COPY vite.config.ts tsconfig.json ./
COPY resources ./resources
COPY public ./public

RUN npm run build

# ─── PHP dependencies (development) ────────────────────────────────────────────
FROM composer:2 AS vendor-dev

WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install --no-interaction --prefer-dist --no-scripts

COPY . .
RUN composer dump-autoload --optimize

# ─── PHP dependencies (production) ─────────────────────────────────────────────
FROM composer:2 AS vendor-prod

WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install --no-interaction --prefer-dist --no-scripts --no-dev

COPY . .
RUN composer dump-autoload --optimize --classmap-authoritative

# ─── Shared PHP extensions ─────────────────────────────────────────────────────
FROM php:8.4-fpm-bookworm AS php-ext

RUN apt-get update && apt-get install -y --no-install-recommends \
        libicu-dev \
        libpq-dev \
        libzip-dev \
        unzip \
    && docker-php-ext-install -j"$(nproc)" \
        bcmath \
        intl \
        opcache \
        pdo_pgsql \
        zip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ─── Development (CLI + artisan serve) ───────────────────────────────────────────
FROM php:8.4-cli-bookworm AS dev

RUN apt-get update && apt-get install -y --no-install-recommends \
        libicu-dev \
        libpq-dev \
        libzip-dev \
        unzip \
        git \
    && docker-php-ext-install -j"$(nproc)" \
        bcmath \
        intl \
        opcache \
        pdo_pgsql \
        zip \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html

COPY --from=vendor-dev /app /var/www/html
COPY --from=frontend /app/public/build ./public/build

RUN mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

COPY docker/entrypoint-dev.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER www-data

EXPOSE 8000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]

# ─── Production (nginx + php-fpm) ────────────────────────────────────────────────
FROM php-ext AS prod

RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        nginx \
        supervisor \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -f /etc/nginx/sites-enabled/default

WORKDIR /var/www/html

COPY --from=vendor-prod /app /var/www/html
COPY --from=frontend /app/public/build ./public/build

COPY docker/nginx/prod.conf /etc/nginx/conf.d/default.conf
COPY docker/php/opcache-prod.ini /usr/local/etc/php/conf.d/99-opcache-prod.ini
COPY docker/supervisord.conf /etc/supervisor/conf.d/kibondo.conf
COPY docker/entrypoint-prod.sh /usr/local/bin/entrypoint.sh

RUN mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]

# ─── Production workers (queue, scheduler) ─────────────────────────────────────
FROM php:8.4-cli-bookworm AS prod-worker

RUN apt-get update && apt-get install -y --no-install-recommends \
        libicu-dev \
        libpq-dev \
        libzip-dev \
        unzip \
    && docker-php-ext-install -j"$(nproc)" \
        bcmath \
        intl \
        opcache \
        pdo_pgsql \
        zip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html

COPY --from=vendor-prod /app /var/www/html
COPY --from=frontend /app/public/build ./public/build
COPY docker/entrypoint-prod.sh /usr/local/bin/entrypoint.sh

RUN mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod +x /usr/local/bin/entrypoint.sh

USER www-data

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["php", "artisan", "queue:work", "--sleep=3", "--tries=3", "--max-time=3600", "--timeout=30"]
