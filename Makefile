.PHONY: dev-up dev-down dev-logs dev-test dev-seed prod-up prod-down prod-logs prod-build

COMPOSE_DEV  = docker compose -f docker-compose.dev.yml
COMPOSE_PROD = docker compose -f docker-compose.prod.yml -f docker-compose.prod.publish.yml

# ─── Development ───────────────────────────────────────────────────────────────
dev-up:
	$(COMPOSE_DEV) up --build -d

# First-time only (or after intentional reset): RUN_SEED=true make dev-up
# Re-seed without wiping customers/sales: make dev-seed
dev-seed:
	$(COMPOSE_DEV) exec app php artisan db:seed --force

dev-down:
	$(COMPOSE_DEV) down

# WARNING: removes named volumes (postgres_data) — destroys the DB
dev-down-wipe:
	$(COMPOSE_DEV) down -v

dev-logs:
	$(COMPOSE_DEV) logs -f app queue vite

dev-test:
	$(COMPOSE_DEV) --profile test run --rm test

dev-vite:
	$(COMPOSE_DEV) up -d vite

dev-migrate:
	$(COMPOSE_DEV) exec app php artisan migrate --force

dev-migrate-seed:
	$(COMPOSE_DEV) exec app php artisan migrate --seed --force

dev-migrate-fresh:
	@echo "WARNING: This DROPS all tables in kibondo_db."
	$(COMPOSE_DEV) exec app php artisan migrate:fresh --force

dev-migrate-fresh-seed:
	@echo "WARNING: This DROPS all tables in kibondo_db, then seeds."
	$(COMPOSE_DEV) exec app php artisan migrate:fresh --seed --force
# ─── Production ────────────────────────────────────────────────────────────────
prod-build:
	docker network inspect coolify >/dev/null 2>&1 || docker network create coolify
	$(COMPOSE_PROD) build

prod-up:
	docker network inspect coolify >/dev/null 2>&1 || docker network create coolify
	$(COMPOSE_PROD) up --build -d

prod-down:
	$(COMPOSE_PROD) down

prod-logs:
	$(COMPOSE_PROD) logs -f web
