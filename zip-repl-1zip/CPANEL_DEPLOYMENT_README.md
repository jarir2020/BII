# Bengali Islamic Institute — cPanel Deployment
### Three steps. One command does everything else.

---

## What you need before starting

- Your **MongoDB Atlas connection string** — looks like:
  `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/...`
  Get it from: [cloud.mongodb.com](https://cloud.mongodb.com) → your cluster → Connect → "Connect your application"

- Your **domain name** (e.g. `https://yourdomain.com`)

- An **admin email and password** for logging into the site

That's it. Everything else is automatic.

---

## Step 1 — Upload and extract the ZIP (2 minutes)

1. Log into **cPanel** (usually `yourdomain.com/cpanel`)
2. Click **File Manager**
3. Open the `public_html` folder
4. Click **Upload** at the top → upload `bii_cpanel_deploy.zip`
5. When upload finishes, right-click the ZIP file → **Extract**
6. In the extract dialog make sure it says `public_html` as the destination → click OK
7. After extracting you should see these files directly inside `public_html`:
   `index.html`, `server.py`, `passenger_wsgi.py`, `.htaccess`, `setup.sh`, `static/`, etc.
8. **Important:** if the files extracted into a subfolder called `bii_deploy`, select all of them and move them up into `public_html` directly, then delete the empty `bii_deploy` folder.

---

## Step 2 — Create the Python App (2 minutes, 6 clicks)

> This is the only step that cannot be automated — cPanel requires you to register the Python app through its control panel once.

1. In cPanel, search for **"Setup Python App"** and open it
2. Click the green **"Create Application"** button
3. Fill in exactly:

   | Field | Enter this |
   |-------|-----------|
   | Python version | **3.10** (or 3.11 if 3.10 is not listed) |
   | Application root | `public_html` |
   | Application URL | `/` |
   | Application startup file | `passenger_wsgi.py` |
   | Application Entry point | `application` |

4. Click **Create** and wait for the green checkmark

---

## Step 3 — Run the one-command installer (3 minutes)

1. In cPanel, open **Terminal** (search for "Terminal" in cPanel)
2. Copy and paste this single command, then press Enter:

```bash
bash ~/public_html/setup.sh
```

3. The script will ask you 4 questions:

   - **MongoDB connection string** — paste the one from your Atlas account
   - **Your domain** — e.g. `https://yourdomain.com`
   - **Admin email** — your login email for the admin panel
   - **Admin password** — choose a strong password

4. It then automatically:
   - Installs all Python packages
   - Generates a secure secret key
   - Creates your `.env` settings file
   - Sets folder permissions
   - Restarts the app

---

## Verify it works

Open your domain in a browser. You should see the Bengali Islamic Institute homepage.

- Test the API: `https://yourdomain.com/api/health`
- Login as admin: `https://yourdomain.com/login`

---

## If anything goes wrong

### Site shows a blank page or 500 error
Go to cPanel → **Setup Python App** → click **Restart** next to your app.
Then open cPanel → **Logs** → look at the Passenger or Python error log.

### "Can't connect to MongoDB" or database error
Your MongoDB Atlas hasn't allowed your server's IP.
Fix: Log into [cloud.mongodb.com](https://cloud.mongodb.com) → Network Access → Add IP Address → add your server's IP.
*(Ask ProCloudify: "What is my server's outbound IP address?")*

### Pages like /courses or /admin give 404
The `.htaccess` file is not being read. Contact ProCloudify and ask: **"Please enable mod_rewrite for my domain."**

### "Application Error" on every page
Python packages not installed. Run `bash ~/public_html/setup.sh` again from cPanel Terminal.

### Ran setup.sh but the site still uses old settings
Delete `~/public_html/.env` and run `bash ~/public_html/setup.sh` again.

---

## Required cPanel feature

Your hosting plan must support **"Setup Python App"** (Passenger WSGI). This is a standard feature in all ProCloudify plans that include Python hosting. If you do not see "Setup Python App" in your cPanel, contact ProCloudify support and ask: **"Please enable Python App / Passenger WSGI for my account."**

---

## After your site is live

1. **Change your admin password** — log in → Admin Panel → Profile → Change Password
2. **Enable HTTPS** — cPanel → SSL/TLS → Let's Encrypt → issue a free certificate for your domain
3. **Set CORS to your domain** — edit `~/public_html/.env`, change `CORS_ORIGINS` from `*` to `https://yourdomain.com`, then restart the Python App

---

## What's in the ZIP

| File | Purpose |
|------|---------|
| `index.html` | React app entry point |
| `static/` | CSS, JavaScript, fonts (served directly by Apache — fast) |
| `manifest.json`, `robots.txt` etc | Standard web app files |
| `server.py` | Python backend (FastAPI — handles all /api/ requests) |
| `passenger_wsgi.py` | Bridges FastAPI to cPanel's Passenger system |
| `.htaccess` | Tells Apache how to route traffic |
| `requirements_prod.txt` | Python packages to install |
| `setup.sh` | Automated installer script |
| `.env.example` | Settings template (setup.sh creates the real .env) |
| `uploads/` | Folder where user-uploaded images are stored |
