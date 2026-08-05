Manual Testing Report

## Phase 1 ✅ DONE

### 1. Play Protect block
App blocked by Play Protect → "Install anyway" → installs successfully.

**Status:** ✅ Expected behavior for debug APKs not signed with a release keystore. The "Install anyway" flow is normal for development. For production, a signed release APK from Play Store won't trigger this.

### 2. Network Error on login
Tried: `jarircse16@gmail.com` / `12345678` → "Network Error"

**Root cause:** CORS — the backend rejected requests from the Capacitor Android WebView (`Origin: capacitor://localhost`).

**Fix applied:** Added `capacitor://localhost`, `https://localhost`, `http://localhost`, and `null` to the backend CORS whitelist in `ApiController.php`. Deployed to production (commit `82d4665`).

**Verified:** Backend now returns proper CORS headers for Capacitor origins:
```
access-control-allow-origin: capacitor://localhost
access-control-allow-credentials: true
```

**Error logging improved:** Frontend `formatApiError()` now logs full error details (status, URL, data) to `console.error` for easier debugging.

**Status:** ✅ Fixed — test again with the new APK.
