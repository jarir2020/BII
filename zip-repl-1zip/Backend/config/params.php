<?php

declare(strict_types=1);

// Application parameters. Secrets come from the environment (.env in prod,
// env vars in CI). The .env loader in web/index.php populates getenv().
return [
    'adminEmail' => getenv('ADMIN_EMAIL') ?: 'admin@example.com',
    'senderEmail' => getenv('SMTP_USER') ?: 'noreply@example.com',
    'senderName' => 'Bengali Islamic Institute',

    // JWT
    'jwtSecret' => getenv('JWT_SECRET') ?: 'dev-only-insecure-secret-change-me',
    'jwtAlgo' => 'HS256',
    'jwtTtl' => 60 * 60 * 24 * 7,       // 7 days, matching FastAPI cookie max-age

    // App / site
    'siteUrl' => rtrim((string) (getenv('SITE_URL') ?: ''), '/'),
    'appName' => getenv('APP_NAME') ?: 'bii',
    'appVersion' => getenv('APP_VERSION') ?: '1.0.0',
    'dbName' => getenv('DB_NAME') ?: 'bii_db',

    // CORS origins (comma separated)
    'corsOrigins' => array_values(array_filter(array_map('trim', explode(',', getenv('CORS_ORIGINS') ?: '*')))),

    'cookieValidationKey' => getenv('COOKIE_VALIDATION_KEY')
        ?: substr(hash('sha256', getenv('JWT_SECRET') ?: 'bii-dev'), 0, 32),
];
