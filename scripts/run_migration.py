#!/usr/bin/env python3
"""Run pending production database migrations through the protected API."""

import json
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


URL = os.getenv(
    "MIGRATION_URL",
    "https://www.bengaliislamicinstitute.com/api/admin/migrate",
)
SECRET = "f5604ccdaf871ee2c9a5d1a92335f88599160e2bfd2a4a16d59c8f1276c4bc80"


def main() -> int:
    if not SECRET:
        print("Error: set MIGRATE_SECRET before running this script.", file=sys.stderr)
        return 2

    request = Request(
        URL,
        method="POST",
        headers={
            "X-Migrate-Secret": SECRET,
            "Accept": "application/json",
        },
    )

    try:
        with urlopen(request, timeout=120) as response:
            raw = response.read().decode("utf-8")
            print(json.dumps(json.loads(raw), ensure_ascii=False, indent=2))
            return 0
    except HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        print(f"Migration request failed with HTTP {error.code}:\n{body}", file=sys.stderr)
    except URLError as error:
        print(f"Could not reach migration endpoint: {error.reason}", file=sys.stderr)
    except (TimeoutError, json.JSONDecodeError) as error:
        print(f"Migration response could not be read: {error}", file=sys.stderr)

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
