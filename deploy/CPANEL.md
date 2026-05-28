# cPanel deployment — terminal command reference

Kibondo on shared cPanel: Laravel app in `kibondo_store/`, web root at  
`public_html/store.kibondogreenfarm.co.tz/`. Requires **PHP 8.3+** and **PostgreSQL 13+**.

Set these once per SSH session:

```bash
export APP_ROOT=/home/kibondogreenfarm/kibondo_store
export WEB_ROOT=/home/kibondogreenfarm/public_html/store.kibondogreenfarm.co.tz
export PHP=/opt/cpanel/ea-php83/root/usr/bin/php

cd "$APP_ROOT"
alias php="$PHP"
php -v   # must be 8.3.x
```

If `ea-php83` is missing: `ls /opt/cpanel/ea-php*/root/usr/bin/php` and pick 8.3+.

---

## Folder layout

```text
/home/kibondogreenfarm/
├── kibondo_store/          ← artisan, .env, vendor, storage
└── public_html/
    └── store.kibondogreenfarm.co.tz/   ← index.php, .htaccess, build/
```

`index.php` in `WEB_ROOT` must load the app from `kibondo_store`:

```php
require __DIR__.'/../../kibondo_store/vendor/autoload.php';
$app = require_once __DIR__.'/../../kibondo_store/bootstrap/app.php';
```

(Full file: copy from `kibondo_store/public/index.php` and fix the two paths above.)

---

## Initial server setup

### Permissions

```bash
chmod -R 775 "$APP_ROOT/storage" "$APP_ROOT/bootstrap/cache"
```

### Storage link (uploads / product images)

```bash
rm -rf "$WEB_ROOT/storage"
ln -s ../../kibondo_store/storage/app/public "$WEB_ROOT/storage"
ls -la "$WEB_ROOT/storage"
```

### Ensure `.htaccess` exists in web root

```bash
test -f "$WEB_ROOT/.htaccess" || cp "$APP_ROOT/public/.htaccess" "$WEB_ROOT/.htaccess"
```

Required for `/sanctum/csrf-cookie` and `/api/v1/*`.

### Environment file

```bash
# Edit production settings
nano "$APP_ROOT/.env"
```

Minimum:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://store.kibondogreenfarm.co.tz
DB_CONNECTION=pgsql
DB_HOST=localhost
DB_DATABASE=...
DB_USERNAME=...
DB_PASSWORD=...
SANCTUM_STATEFUL_DOMAINS=store.kibondogreenfarm.co.tz
SESSION_DOMAIN=.kibondogreenfarm.co.tz
SESSION_SECURE_COOKIE=true
```

---

## Database

### Run migrations (empty database)

```bash
cd "$APP_ROOT"
php artisan migrate --force
```

### Import from local Docker (on your PC)

```bash
# On PC — produces deploy/kibondo_database_cpanel.sql
./deploy/export-database-cpanel.sh
# Upload SQL to server, then in psql or phpPgAdmin import into cPanel DB
```

### Fix table permissions after SQL import

If the app user cannot read tables (`permission denied for migrations`):

```sql
GRANT USAGE ON SCHEMA public TO your_db_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_db_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_db_user;
```

Run in phpPgAdmin **SQL** tab (not inside a `SELECT`).

### Verify database

```bash
php artisan tinker --execute="echo \DB::table('migrations')->count().\" migrations\n\";"
```

---

## Staff admin user

```bash
cd "$APP_ROOT"
php artisan tinker --execute="
\App\Models\User::updateOrCreate(
    ['email' => 'admin@kibondogreenfarm.co.tz'],
    [
        'name' => 'System Admin',
        'password' => 'your-secure-password',
        'role' => 'admin',
        'is_active' => true,
    ]
);
echo \"Admin ready\n\";
"
```

Login: `https://store.kibondogreenfarm.co.tz/`  
Roles: `admin`, `sales`, `stock_manager`, `accountant`.

---

## Laravel maintenance

```bash
cd "$APP_ROOT"

# Clear caches (after .env or code changes)
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan cache:clear

# List routes (debug 404 on sanctum)
php artisan route:list --path=sanctum

# Application key (only once)
php artisan key:generate --show

# Storage link (if using default public/ as web root — optional here)
php artisan storage:link
```

Do **not** run `config:cache` on cPanel unless you know paths are correct.

---

## Cron (scheduler + queue)

```bash
crontab -e
```

Add (use `$PHP` path):

```cron
* * * * * cd /home/kibondogreenfarm/kibondo_store && /opt/cpanel/ea-php83/root/usr/bin/php artisan schedule:run >> /dev/null 2>&1
*/2 * * * * cd /home/kibondogreenfarm/kibondo_store && /opt/cpanel/ea-php83/root/usr/bin/php artisan queue:work --stop-when-empty --max-time=110 >> /dev/null 2>&1
```

---

## Deploy code updates

Upload changed files (or `git pull` if repo is on server), then:

```bash
cd "$APP_ROOT"
php artisan migrate --force
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

If frontend changed on PC: upload `WEB_ROOT/build/` after `npm run build`.

If Composer dependencies changed on PC: re-upload `vendor/` (built with PHP 8.3 — see README / Docker).

---

## Local PC — build before upload

```bash
cd /path/to/Kibondo

# PHP deps for cPanel PHP 8.3
docker run --rm -v "$(pwd):/app" -w /app composer:2 \
  sh -c "composer config platform.php 8.3.31 && composer install --no-dev --optimize-autoloader"

npm ci && npm run build

# Database dump for import
./deploy/export-database-cpanel.sh
```

---

## Troubleshooting

| Problem | Command / check |
|---------|------------------|
| Composer “requires PHP >= 8.3” | Use `$PHP` = `ea-php83`, not default `php` |
| 404 on `/sanctum/csrf-cookie` | `test -f "$WEB_ROOT/.htaccess"`; `php artisan route:list --path=sanctum` |
| 500 after DB import | GRANT privileges; read `tail -30 storage/logs/laravel.log` |
| Login / CSRF fails | `.env` `APP_URL`, `SANCTUM_STATEFUL_DOMAINS`, `SESSION_DOMAIN` |
| Images 404 | `ls -la "$WEB_ROOT/storage"` → symlink to `storage/app/public` |

```bash
tail -30 "$APP_ROOT/storage/logs/laravel.log"
```

### Remove old one-time debug files (if uploaded earlier)

```bash
rm -f "$WEB_ROOT/cpanel-check.php" "$WEB_ROOT/cpanel-create-admin.php"
```

---

## URLs

| URL | Purpose |
|-----|---------|
| `https://store.kibondogreenfarm.co.tz/` | Staff dashboard |
| `https://store.kibondogreenfarm.co.tz/store` | Customer storefront |
| `https://store.kibondogreenfarm.co.tz/sanctum/csrf-cookie` | Should not 404 (empty/204) |

---

## Related files in `deploy/`

| File | Purpose |
|------|---------|
| `export-database-cpanel.sh` | Export PG 13 SQL dump from Docker (run on PC) |
| `crontab.txt` | Cron comment reference |
| `supervisor-worker.conf` | VPS/Docker queue worker (not cPanel) |
| `pgbouncer.ini` | VPS connection pooling (not cPanel) |

VPS/Docker production: see [DEPLOYMENT.md](../DEPLOYMENT.md) in the repo root.
