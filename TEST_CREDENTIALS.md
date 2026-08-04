# Test Credentials

Confirmed by the client (2026-08-04). For testing the deployed app.

| Role | Email | Password |
|------|-------|----------|
| Student / Normal User | `saidurmollah10@gmail.com` | `saidur12` |
| Admin User | `bengaliislamicinstitute@gmail.com` | `12345678` |

## Production status (verified 2026-08-04 via `/api/auth/login`)

| Account | Wanted role | Prod role now | Status |
|---------|-------------|---------------|--------|
| `saidurmollah10@gmail.com` | student | **student** | ✓ applied via `m250804_000011_seed_test_users` |
| `bengaliislamicinstitute@gmail.com` | admin | **super_admin** | ✓ already admin |

Both accounts exist and log in successfully on https://bengaliislamicinstitute.com.

> The corrective seed `Backend/migrations/m250804_000011_seed_test_users.php` enforces these
> roles idempotently (create-or-update, safe to re-run). Note: the legacy migration
> `m250802_000010_seed_admin.php` sets `saidurmollah10@gmail.com` → `super_admin`; because the
> corrective migration has a newer version, it runs after and wins — but re-applying only the
> legacy one (e.g. via `yii migrate/down` then up) could undo the student role.
>
> New migrations are applied to production by calling
> `POST /api/admin/migrate` (requires a `super_admin` JWT or the `X-Migrate-Secret` header).
