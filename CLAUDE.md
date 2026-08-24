# CLAUDE.md

## Startup Routine (run every new session)

On every new session, silently load memory before doing anything else:

1. Read `~/.claude/projects/-home-jarir-ahmed-Downloads-bengalislamicInstitute-public-html/memory/MEMORY.md` — index of all memory files
2. Read each file listed in MEMORY.md
3. Apply all feedback/preferences immediately — no need for the user to repeat them
4. Check `~/.claude/tools/README.md` — know what tools are available before starting any task
5. Read `~/.claude/settings.json` for allowed commands — never ask for already-allowed ones

Do this silently. Do not announce it. Do not summarize what you loaded.

---

## Project Overview

**Bengal Islamic Institute (BII)** — full-stack e-learning platform. Repo root is this directory (`public_html`); push to `main` → GitHub Actions builds & FTP-deploys straight to live production. **Never commit broken code.**

### Structure
- `zip-repl-1zip/Frontend/` — React 19 (CRA, yarn). Pages in `src/pages/`, shared components in `src/components/`, contexts in `src/contexts/`. Admin UI under `src/pages/admin/`.
- `zip-repl-1zip/Backend/` — Yii2 PHP 8.1 app. REST API in `modules/api/controllers/`, models in `models/`, MySQL DB.
- `.github/workflows/deploy.yml` — CI: composer install → yarn build → `deploy/build-staging.sh` merges both builds → lftp FTP upload. Secrets: FTP_HOST/USERNAME/PASSWORD/TARGET, MIGRATE_SECRET.
- Root-level files here (`index.html`, `static/`, `ads.txt`, `sitemap.xml`, `firebase-messaging-sw.js`) are the deployed web root / legacy copies — frontend build output lands here via deploy script.

### Key features
Courses & live classes, library (book reader), shop w/ SSLCommerz payments, quizzes, Reward Zone (points, rewarded ads — platform configurable per migrate_reward_ads_platform), FCM push notifications, ads system: `AdsContext` + `AdBanner.jsx` (AdSense) + `BottomBanner.jsx` + `FullScreenAdOverlay.jsx`, ad config served from backend ConfigsController (separate web/app config).

### External integrations
Google AdSense (pub-8159903471366423), AdMob (app banner/rewarded), SSLCommerz, Firebase FCM, cPanel hosting over FTP.

---

## Rules & Best Practices

1. **Always keep backup** — Before editing or removing any feature, create a backup of the file. This way you can easily revert if mistakes happen without needing to remember exact changes.

2. **Always read first** — Every single time, read the file before editing to avoid write failures and understand the current state. Don't skip this.

3. **Plan before working** — Create a plan file for any significant task. Break it down, think through dependencies and risks first.

4. **Split big tasks** — Divide large tasks into smaller, manageable steps. Keep a progress tracking file to monitor completion.

5. **Update progress after each step** — Mark tasks as complete in your track file, then ask if you should move to the next step. Don't rush ahead.

6. **Stop and ask when confused** — If uncertain about anything, pause, document the confusion point, and ask. Better to clarify than make assumptions.

7. **Add debugging statements** — Include try-catch blocks, console logs, error displays while coding. These will be removed later once stability is confirmed.

8. **Never query inside loops** — Query the database first, store results in an array, then loop the array. This dramatically reduces server load and prevents N+1 problems.

9. **Create reusable helper files** — If same work might be done again (PDF Export, Excel Import/Export, Image Upload), make helper files now. Writing less code reduces stress and bugs.

10. **Self-healing database models** — When writing models, include auto-creation of tables/columns if they don't exist. Silently create missing structures instead of throwing errors.

11. **CDN local fallback** — Add helper functions to download external CDN JS/CSS files locally if they don't exist. Reduces server load and improves reliability.

12. **Check vendor before downloading** — Always check existing vendor/packages before downloading a new one. You might find what you need is already available.

13. **Reuse frontend components** — In React/Vue components, reuse CSS classes and component segments. Extract common patterns into smaller, shared components.

14. **Break big files** — Don't hesitate to split large files into smaller, focused ones. Use helper or shared components for better organization and faster debugging.

15. **Security First** — Sanitize ALL user inputs, use parameterized queries/ORM to prevent SQL injection, escape all outputs to prevent XSS, validate file uploads (type, size, content), never commit secrets, implement auth checks on every endpoint.

16. **Clear Documentation** — Add comments explaining the "why" (not just "what") for complex logic. Document function parameters/return values with types/examples. Update READMEs when features change. Use meaningful names.

17. **Test Edge Cases** — Test null/undefined, empty inputs, boundary values, concurrent operations, empty database states. Implement graceful degradation when external services fail. Test error paths, not just happy paths. Generate and store common test files or ideas for reducing your own load.

18. **Environment-aware code** — Never hardcode URLs, API keys, or env-specific values. Use environment variables or config files. Separate dev/staging/prod configurations. Log verbose in dev, minimal in prod.

19. **Performance as a feature** — Add database indexes for frequently queried columns. Implement caching (Redis, memoization) for repeated operations. Use lazy/eager loading strategically. Minimize DB round trips. Optimize frontend assets.

20. **User-centric error handling** — Show loading states for async operations. Display actionable error messages (tell users what to do, not just "error"). Confirm destructive actions. Validate forms in real-time with helpful feedback.

21. **Intelligent git workflow** — Write descriptive commit messages (what & why). Keep commits atomic. Reference issue/ticket numbers. Use feature branches. Review `git diff` before committing. Properly configure `.gitignore`.

22. **Configuration over convention** — Make behavior configurable, not hardcoded. Use feature flags. Store business rules in database/config rather than scattered in code. Enables changes without code deployment.

23. **Automated tools for efficiency** — Create automated tools in Python/PHP/JS to understand systems or automate repetitive tasks. Store commonly used tools in `~/.claude/tools/` for faster lookup.

24. **Reduce your own load** — Always focus on creating helpers/Python,JS,PHP test files and caching them. Never delete cached tools. Check what you already have before building new. Find generalized patterns in tasks. Cache commonly used commands. You mainly work on PHP Frameworks, JS Frameworks, HTML, CSS, CSS Libraries, and sometimes Python.

25. **Run linters + pre-commit hooks** — Create syntax checker tools for faster syntax error checking.

26. **Always add comments where you changed last** — Use Date-Time format for change comments.

27. **Don't explain code unless asked** — Just code. If mistake made, user will say so. No narration, no "here's what I did", no summaries of changes unless explicitly requested.

28. **Silent thinking** — Think and decide internally. Don't output reasoning, decisions, or thought process. Only output the result/code/answer.
