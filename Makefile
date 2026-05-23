.PHONY: dev-up dev-down dev-logs dev-test dev-seed prod-up prod-down prod-logs prod-build

COMPOSE_DEV  = docker compose -f docker-compose.dev.yml
COMPOSE_PROD = docker compose -f docker-compose.prod.yml

# ─── Development ───────────────────────────────────────────────────────────────
dev-up:
	$(COMPOSE_DEV) up --build -d

dev-down:
	$(COMPOSE_DEV) down

dev-logs:
	$(COMPOSE_DEV) logs -f app

dev-test:
	$(COMPOSE_DEV) --profile test run --rm test

dev-seed:
	$(COMPOSE_DEV) exec app php artisan db:seed --force

dev-vite:
	$(COMPOSE_DEV) --profile vite up -d vite

# ─── Production ────────────────────────────────────────────────────────────────
prod-build:
	$(COMPOSE_PROD) build

prod-up:
	$(COMPOSE_PROD) up --build -d

prod-down:
	$(COMPOSE_PROD) down

prod-logs:
	$(COMPOSE_PROD) logs -f web
