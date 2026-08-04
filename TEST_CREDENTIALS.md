# Test Credentials

Confirmed by the client (2026-08-04). For testing the deployed app.

| Role | Email | Password |
|------|-------|----------|
| Student / Normal User | `saidurmollah10@gmail.com` | `saidur12` |
| Admin User | `bengaliislamicinstitute@gmail.com` | `12345678` |

## Production status (checked 2026-08-04 via `/api/auth/login`)

| Account | Wanted role | Current prod role | Action |
|---------|-------------|-------------------|--------|
| `saidurmollah10@gmail.com` | student | super_admin | **needs downgrade → student** |
| `bengaliislamicinstitute@gmail.com` | admin | super_admin | already an admin ✓ |

Both accounts exist and can log in on https://bengaliislamicinstitute.com.

> Note: legacy seed migration `Backend/migrations/m250802_000010_seed_admin.php` forces
> `saidurmollah10@gmail.com` → `super_admin`. If that migration is re-run, it will undo the
> student role. A corrective idempotent migration (or SQL) is required to enforce `student`.
