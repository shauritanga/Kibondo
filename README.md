# Kibondo Green Farm

Business management system for Kibondo Green Farm — a fresh produce supplier in Tanzania. Covers sales, stock, customers, payments, and marketing campaigns for staff, with a separate customer-facing storefront.

## What's inside

**Staff dashboard** (`/`) — internal web app for the farm team:
- POS / sales recording with walk-in and account customers
- Stock management with reorder alerts and stock-in tracking
- Customer CRM with notes, tasks, and outstanding balances
- Financial reports — revenue, stock value, payment method breakdown
- Email campaign composer with per-customer-type targeting
- User management with role-based access control

**Customer storefront** (`/store`) — public-facing shop:
- Browse the product catalog with live stock levels
- Cart, checkout, and delivery address capture
- Order history and delivery confirmation

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Laravel 13, PHP 8.2 |
| Auth | Laravel Sanctum (two guards: `staff` and `customer`) |
| Database | MySQL / SQLite (tests) |
| Frontend | React 19, TypeScript, Tailwind CSS v4 |
| Build | Vite — two independent bundles (staff + client) |
| Routing | react-router-dom v7 |
| HTTP client | Axios |
| Charts | Recharts |
| Email | Laravel Mail + queue |

## Project structure

```
app/
├── Http/
│   ├── Controllers/          # Staff API controllers
│   │   └── Store/            # Customer storefront controllers
│   ├── Requests/             # Form request validation
│   └── Resources/            # API response transformers
├── Models/                   # Eloquent models
├── Services/                 # Business logic
├── Jobs/                     # Queued jobs (campaign sending)
└── Mail/                     # Mailable classes

resources/js/
├── staff/                    # Staff dashboard SPA
│   ├── pages/                # DashboardPage, PosPage, ProductsPage,
│   │                         #   CustomersPage, ReportsPage,
│   │                         #   CampaignsPage, SettingsPage, LoginPage
│   ├── components/           # AppShell, PageHeader, StatusBadge,
│   │                         #   ErrorBanner, FormInput, SearchInput,
│   │                         #   StatCard, EmptyState, Skeleton
│   ├── contexts/             # AuthContext, ThemeContext
│   ├── services/             # Axios API client
│   └── types/                # TypeScript interfaces
├── client/                   # Customer storefront SPA
│   ├── pages/                # StorePage, CheckoutPage, OrdersPage,
│   │                         #   OrderDetailPage, ConfirmationPage,
│   │                         #   StoreLoginPage, StoreRegisterPage
│   ├── contexts/             # StoreAuthContext, CartContext
│   └── services/             # Axios API client
└── shared/
    └── components/           # ErrorBoundary (used by both apps)

routes/
├── api.php                   # All API routes (staff + store)
└── web.php                   # SPA catch-all routes

tests/Feature/
└── Store/                    # Customer storefront feature tests
```

## API overview

All endpoints are under `/api/v1/`.

**Staff (requires `auth:sanctum`):**
```
POST   /auth/login              POST   /sales
GET    /auth/me                 GET    /sales/{sale}
GET    /products                PUT    /sales/{sale}
POST   /products                GET    /customers
PUT    /products/{product}      POST   /customers
GET    /categories              GET    /customers/{id}/notes
POST   /stock-movements         GET    /customers/{id}/tasks
GET    /reports/dashboard       GET    /campaigns
GET    /reports/sales           POST   /campaigns
GET    /reports/stock-value     POST   /campaigns/{id}/send
GET    /users                   POST   /offline-queue/sync
```

**Customer storefront (public + `auth:sanctum,customer`):**
```
POST   /store/auth/register     GET    /store/products
POST   /store/auth/login        GET    /store/categories
GET    /store/orders            POST   /store/orders
GET    /store/orders/{id}       POST   /store/orders/{id}/confirm
```

## Setup

```bash
# 1. Install dependencies
composer install
npm install

# 2. Configure environment
cp .env.example .env
php artisan key:generate

# 3. Run migrations and seeders
php artisan migrate --seed

# 4. Start development servers
php artisan serve
npm run dev
```

The staff dashboard is served at `http://localhost:8000` and the customer storefront at `http://localhost:8000/store`.

## Testing

```bash
php artisan test
```

28 feature tests, 80 assertions. Tests use PostgreSQL (`kibondo_test` by default; see `phpunit.xml`).

## Docker

Run the full stack (app, queue worker, PostgreSQL) without installing PHP or Node locally:

```bash
# Build and start (first run may take a few minutes)
docker compose up --build -d

# Staff dashboard: http://localhost:8000
# Storefront:      http://localhost:8000/store
# Health check:    http://localhost:8000/up
```

Run the test suite inside Docker:

```bash
docker compose --profile test run --rm test
```

**Default admin login** (seeded automatically on first start):

| Field | Value |
|---|---|
| URL | http://localhost:8000/login |
| Email | `admin@kibondo.local` |
| Password | `password` |

Email OTP for admins is disabled in Docker (`REQUIRE_2FA_FOR_ADMINS=0`). Override credentials with `DEV_ADMIN_EMAIL` / `DEV_ADMIN_PASSWORD`.

If the stack was already running before seeding was enabled:

```bash
docker compose exec app php artisan db:seed --force
```

Optional:

```bash
# View logs
docker compose logs -f app

# Stop and remove containers (keeps database volume)
docker compose down
```

Environment variables (see `docker-compose.yml`):

| Variable | Default | Purpose |
|---|---|---|
| `APP_PORT` | `8000` | Host port for the web app |
| `DB_PASSWORD` | `Kibondo@2026` | PostgreSQL password (matches `phpunit.xml`) |
| `RUN_SEED` | `true` | Run `php artisan db:seed` on container start |
| `DEV_ADMIN_EMAIL` | `admin@kibondo.local` | Seeded admin email |
| `DEV_ADMIN_PASSWORD` | `password` | Seeded admin password |
| `REQUIRE_2FA_FOR_ADMINS` | `0` | Set to `1` to require email OTP on admin login |
| `APP_KEY` | (built-in dev key) | Laravel encryption key |

> For non-Docker setups, copy `database/seeders/AdminUserSeeder.example.php` to `AdminUserSeeder.php` (gitignored) with your own credentials.

## Roles

| Role | Access |
|---|---|
| `admin` | Full access — users, settings, all reports |
| `sales` | POS, sales, customers |
| `stock_manager` | Products, stock movements |
| `accountant` | Sales (read), reports, payments |

## Currency

All monetary values are stored and returned in **TZS (Tanzanian Shilling)** as integers.
