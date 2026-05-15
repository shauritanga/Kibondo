# Deployment Guide — DigitalOcean (`206.189.181.117`)

## Step 1 — SSH into the server

```bash
ssh root@206.189.181.117
```

---

## Step 2 — Update the system

```bash
apt update && apt upgrade -y
```

---

## Step 3 — Install required software

```bash
# PHP 8.3 + extensions
apt install -y software-properties-common
add-apt-repository ppa:ondrej/php -y
apt update
apt install -y php8.3 php8.3-fpm php8.3-cli php8.3-pgsql php8.3-mbstring \
  php8.3-xml php8.3-curl php8.3-zip php8.3-bcmath php8.3-tokenizer \
  php8.3-intl php8.3-redis

# Nginx
apt install -y nginx

# PostgreSQL
apt install -y postgresql postgresql-contrib

# Node.js 20 + npm
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Composer
curl -sS https://getcomposer.org/installer | php
mv composer.phar /usr/local/bin/composer

# Git
apt install -y git
```

---

## Step 4 — Create a PostgreSQL database and user

```bash
sudo -u postgres psql
```

Inside the PostgreSQL shell:

```sql
-- Create the user and database
CREATE USER kibondo WITH PASSWORD 'choose_a_strong_password';
CREATE DATABASE kibondo_db OWNER kibondo;

-- Grant full database privileges
GRANT ALL PRIVILEGES ON DATABASE kibondo_db TO kibondo;

-- Connect to the new database
\c kibondo_db

-- Transfer public schema ownership to the app user
ALTER SCHEMA public OWNER TO kibondo;

-- Grant all privileges on the public schema
GRANT ALL ON SCHEMA public TO kibondo;

-- Grant privileges on all existing tables and sequences
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO kibondo;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO kibondo;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO kibondo;

-- Ensure future tables and sequences are also accessible
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO kibondo;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO kibondo;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO kibondo;

\q
```

> **Note:** PostgreSQL 15+ removed the default CREATE privilege on the public schema. The steps above are required — skipping them will cause Laravel migrations to fail with "permission denied for schema public".

---

## Step 5 — Create a system user for the app

```bash
adduser --disabled-password --gecos "" kibondo
```

This user owns the project files. When you need to deploy (git pull, composer, npm) you run those commands as `kibondo` rather than root, keeping the web server process (`www-data`) unable to modify application files — a standard security boundary.

---

## Step 6 — Clone the repository

```bash
mkdir -p /var/www/kibondo
cd /var/www/kibondo
git clone https://github.com/shauritanga/Kibondo.git .
chown -R kibondo:www-data /var/www/kibondo
chmod -R 755 /var/www/kibondo
```

---

## Step 7 — Configure the environment file

```bash
cp .env.example .env
nano .env
```

Set these values:

```env
APP_NAME="Kibondo Green"
APP_ENV=production
APP_KEY=                        # will generate in next step
APP_DEBUG=false
APP_URL=http://206.189.181.117

LOG_CHANNEL=stack
LOG_LEVEL=error

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=kibondo_db
DB_USERNAME=kibondo
DB_PASSWORD=choose_a_strong_password

BROADCAST_DRIVER=log
CACHE_DRIVER=file
QUEUE_CONNECTION=database
SESSION_DRIVER=file
SESSION_LIFETIME=120

MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=your@gmail.com
MAIL_FROM_NAME="Kibondo Green"
```

Save and exit (`Ctrl+X`, `Y`, `Enter`).

---

## Step 8 — Install PHP dependencies

```bash
composer install --no-dev --optimize-autoloader
```

---

## Step 9 — Generate app key and run migrations

```bash
php artisan key:generate
php artisan migrate --force
```

---

## Step 10 — Build frontend assets

```bash
npm install
npm run build
```

---

## Step 11 — Set correct permissions

```bash
chown -R www-data:www-data /var/www/kibondo/storage
chown -R www-data:www-data /var/www/kibondo/bootstrap/cache
chmod -R 775 /var/www/kibondo/storage
chmod -R 775 /var/www/kibondo/bootstrap/cache
```

---

## Step 12 — Optimize Laravel for production

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan storage:link
```

---

## Step 13 — Configure Nginx

```bash
nano /etc/nginx/sites-available/kibondo
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name 206.189.181.117;
    root /var/www/kibondo/public;
    index index.php;

    client_max_body_size 20M;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.ht {
        deny all;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }
}
```

Enable the site:

```bash
ln -s /etc/nginx/sites-available/kibondo /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## Step 14 — Set up the queue worker (for notifications)

Install Supervisor if not already installed:

```bash
apt install -y supervisor
```

Create the worker config:

```bash
nano /etc/supervisor/conf.d/kibondo-worker.conf
```

Paste:

```ini
[program:kibondo-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/kibondo/artisan queue:work --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=1
redirect_stderr=true
stdout_logfile=/var/www/kibondo/storage/logs/worker.log
stopwaitsecs=3600
```

Start the worker:

```bash
supervisorctl reread
supervisorctl update
supervisorctl start kibondo-worker:*
```

---

## Step 15 — Verify everything is running

```bash
# Nginx
systemctl status nginx

# PHP-FPM
systemctl status php8.3-fpm

# PostgreSQL
systemctl status postgresql

# Queue worker
supervisorctl status
```

---

## Step 16 — Open the site

| URL | Description |
|-----|-------------|
| `http://206.189.181.117` | Staff dashboard |
| `http://206.189.181.117/store` | Customer storefront |

---

## Future deployments

Run these commands every time you push new code:

```bash
cd /var/www/kibondo
git pull origin main
composer install --no-dev --optimize-autoloader
npm install && npm run build
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
supervisorctl restart kibondo-worker:*
```
