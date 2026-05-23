# syntax=docker/dockerfile:1

FROM node:22-alpine AS frontend

WORKDIR /app

COPY package.json ./
RUN npm install --ignore-scripts

COPY vite.config.ts tsconfig.json ./
COPY resources ./resources
COPY public ./public

RUN npm run build

# -----------------------------------------------------------------------------

FROM composer:2 AS vendor

WORKDIR /app

COPY composer.json composer.lock ./

ARG INSTALL_DEV=true
RUN if [ "$INSTALL_DEV" = "true" ]; then \
        composer install --no-interaction --prefer-dist --no-scripts; \
    else \
        composer install --no-interaction --prefer-dist --no-scripts --no-dev; \
    fi

COPY . .
RUN composer dump-autoload --optimize

# -----------------------------------------------------------------------------

FROM php:8.4-cli-bookworm AS base

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
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html

COPY --from=vendor /app /var/www/html
COPY --from=frontend /app/public/build ./public/build

RUN mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# Default image: dev dependencies (PHPUnit) for local run and test
FROM base AS dev

USER root
RUN apt-get update && apt-get install -y --no-install-recommends $PHPIZE_DEPS \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
USER www-data
