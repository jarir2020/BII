# GO-LIVE — BII Yii2 API

The FastAPI backend has been fully converted to a Yii2 JSON API. This is the
checklist to go live with the existing data.

## 1. Environment

Copy `.env.example` to `.env` and set real values (DB creds, `JWT_SECRET`,
`SITE_URL`, SMTP for OTP emails, `INSTITUTE_NAME_*`).

`.env` keys the API reads:
- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`
- `JWT_SECRET` (any long random string)
- `SITE_URL` (the public base URL, used for SSLCommerz redirects)
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` (for the OTP/reset email)

## 2. Database

MySQL 5.7+ (8.0 recommended), `utf8mb4`. On the host:

```bash
php yii migrate/up --interactive=0     # applies all 10 migrations in order
```

This creates all tables. `users` is empty — seed one admin:

```bash
php yii user/create-admin test@example.com 'super_admin' 'YourSecret1'
# (or register via POST /api/auth/register then UPDATE role in SQL)
```

## 3. Web server

Point the site to `web/` and ensure `.htaccess` rewrites `/api/*` to
`index.php`. Already shipped at `web/.htaccess`. PHP 8.1 (the lock file is
pinned for 8.1 to match the cPanel host). `web/assets` must be writable.

## 4. Data migration (MongoDB Atlas -> MySQL)

On a machine that can reach both MongoDB Atlas and MySQL:

```bash
pip install pymongo pymysql python-dotenv
cp .env.example .env      # add MONGODB_URI + MONGODB_DB
python3 tools/migrate_mongo_to_mysql.py --dry-run    # preview counts
python3 tools/migrate_mongo_to_mysql.py              # migrate everything
```

Collections are mapped to the MySQL schema in
`tools/migrate_mongo_to_mysql.py`; `orders` splits into `orders` +
`order_items`, and the schema-less admin resources go into `generic_items`.
Passwords migrate as-is (bcrypt hashes are format-compatible).

## 5. Config seeding

After migration, ensure these configs exist (set via `PUT /api/configs/<name>`
or seed SQL):
- `reward_zone`  — coins per ad, cashout minimums, etc.
- `payment_gateways` — bKash/Nagad numbers + SSLCommerz store id/password
- `firebase` — FCM server key / service account for push
- `settings` row `id=main` — institute name, contact, bank numbers

## 6. Deploy

Upload the `yii-backend/` tree to the host (FTP/rsync). Run the migrations on
the host. Switch the frontend API base URL from the FastAPI host to the new
Yii host.

## 7. Smoke test

```bash
curl -s $BASE/api/health
curl -s -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@...","password":"..."}'
curl -s $BASE/api/courses
curl -s $BASE/api/settings
```

Then walk the student flows: enroll → payment request → admin approve →
my-courses; rewards watch-ad → redeem; shop order; subscription checkout.
