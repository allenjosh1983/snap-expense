# Deploy snap-expense on Hostinger VPS

Run snap-expense on your own VPS with a stable HTTPS domain — no local dev server or changing Cloudflare tunnel URLs.

**Prerequisites:** Hostinger VPS with SSH access, a domain name, and a Google Cloud service account JSON key (production auth).

---

## What you need before starting

| Item | Example |
|------|---------|
| VPS public IP | `203.0.113.10` |
| SSH login | `root@203.0.113.10` or `ubuntu@…` |
| Domain | `expenses.yourdomain.com` |
| DNS | A record → VPS IP (and optional `www` CNAME/A) |
| Google service account JSON | Download from GCP Console (see [README](../README.md)) |
| Spreadsheet ID | From your Google Sheet URL |

---

## 1. Point DNS to the VPS

At your domain registrar or Cloudflare:

1. Create an **A record**: `expenses` (or `@`) → your VPS **public IP**.
2. Optional: `www` → same IP or CNAME to apex.
3. Wait for propagation (often minutes; up to 48h).

Verify:

```bash
dig +short expenses.yourdomain.com
```

---

## 2. SSH into the VPS

```bash
ssh YOUR_USER@YOUR_VPS_IP
```

Use the username and key/password Hostinger provided. Do **not** share credentials in chat or commit them to git.

---

## 3. Clone the repo

```bash
git clone https://github.com/allenjosh1983/snap-expense.git ~/snap-expense
cd ~/snap-expense
```

Or run the automated setup script (installs Node 20, PM2, builds, starts PM2):

```bash
chmod +x deploy/hostinger-setup.sh
./deploy/hostinger-setup.sh
```

Re-runs are safe: the script pulls latest code, runs `npm ci`, `npm run build`, and `pm2 restart`.

---

## 4. Upload Google credentials (secure)

**Never commit** `.env` or JSON key files to git.

On your **local machine**:

```bash
scp credentials/google-service-account.json YOUR_USER@YOUR_VPS_IP:~/snap-expense/credentials/
```

On the **server**, restrict permissions:

```bash
chmod 700 ~/snap-expense/credentials
chmod 600 ~/snap-expense/credentials/google-service-account.json
```

Share your Google Sheet (and optional Shared Drive folder) with the service account email as **Editor**.

---

## 5. Configure environment variables

```bash
cd ~/snap-expense
cp .env.example .env
nano .env
```

### Required on VPS

| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_APPLICATION_CREDENTIALS` | Absolute path to service account JSON on the server | `/home/ubuntu/snap-expense/credentials/google-service-account.json` |
| `GOOGLE_SHEETS_ID` | Spreadsheet ID from the URL | `1DnzD0Yn_48ZtD00FyfaGHUMer-7Lle3j6YHu53EAZkg` |
| `GOOGLE_SHEETS_TAB` | Tab name for expense rows | `Receipts` |
| `PORT` | Port the Node app listens on (nginx proxies here) | `3000` |

### Recommended

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SPREADSHEET_URL` | Link shown on success screen (public URL only, no secrets) | `https://docs.google.com/spreadsheets/d/YOUR_ID/edit` |

### Optional

| Variable | Description |
|----------|-------------|
| `GOOGLE_DRIVE_FOLDER_ID` | Shared Drive folder for receipt images (service accounts need Shared Drive) |

Example `.env`:

```env
GOOGLE_APPLICATION_CREDENTIALS=/home/ubuntu/snap-expense/credentials/google-service-account.json
GOOGLE_SHEETS_ID=your_spreadsheet_id_here
GOOGLE_SHEETS_TAB=Receipts
NEXT_PUBLIC_SPREADSHEET_URL=https://docs.google.com/spreadsheets/d/your_spreadsheet_id_here/edit
GOOGLE_DRIVE_FOLDER_ID=
PORT=3000
```

After editing `.env`, rebuild and restart:

```bash
npm run build
pm2 restart snap-expense --update-env
```

---

## 6. PM2 process manager

The repo includes `ecosystem.config.cjs` (app name: `snap-expense`).

```bash
cd ~/snap-expense
pm2 start ecosystem.config.cjs    # first time
pm2 restart snap-expense          # after updates
pm2 logs snap-expense             # tail logs
pm2 status
```

PM2 runs `npm start`, which binds to `0.0.0.0` and reads `PORT` (default `3000`).

Smoke test on the server:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000
```

Expect `200`.

---

## 7. Nginx reverse proxy

Install nginx if not already present:

```bash
sudo apt-get update
sudo apt-get install -y nginx
```

Copy and edit the example config:

```bash
sudo cp deploy/nginx-snap-expense.conf.example /etc/nginx/sites-available/snap-expense
sudo nano /etc/nginx/sites-available/snap-expense
```

Replace `YOUR_DOMAIN` with your real domain (e.g. `expenses.yourdomain.com`).

Enable the site:

```bash
sudo ln -sf /etc/nginx/sites-available/snap-expense /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 8. SSL with Let's Encrypt (Certbot)

iPhone camera requires HTTPS. Install certbot:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

Issue a certificate (nginx plugin configures SSL automatically):

```bash
sudo certbot --nginx -d expenses.yourdomain.com -d www.expenses.yourdomain.com
```

Follow prompts (email, agree to terms). Certbot adds HTTPS and HTTP→HTTPS redirect.

Renewal is automatic via systemd timer; test with:

```bash
sudo certbot renew --dry-run
```

---

## 9. Firewall (UFW)

Allow SSH, HTTP, and HTTPS only:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Do **not** expose port 3000 publicly — nginx terminates TLS and proxies to localhost.

---

## 10. Use on your phone

1. Open `https://expenses.yourdomain.com` in Safari.
2. Tap **Share → Add to Home Screen** for a app-like shortcut.
3. Allow camera access when prompted.

---

## Updating the app

```bash
cd ~/snap-expense
git pull
npm ci
npm run build
pm2 restart snap-expense --update-env
```

Or re-run `./deploy/hostinger-setup.sh`.

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| 502 Bad Gateway | `pm2 status`, `pm2 logs snap-expense`, `curl http://127.0.0.1:3000` |
| Sheet save fails | `.env` values, service account shared on sheet, `GOOGLE_APPLICATION_CREDENTIALS` path |
| Camera blocked | Must use HTTPS (certbot), not `http://` or raw IP |
| OCR errors | Vision API enabled in GCP, billing on project |
| Drive upload fails | Use Shared Drive folder for service accounts; see README |

---

## Security reminders

- Never commit `.env` or `credentials/*.json`.
- Keep credentials at `chmod 600`, directory `chmod 700`.
- Rotate service account keys if exposed.
- Restrict SSH (keys only, disable password auth when possible).

---

## Related

- [README](../README.md) — Google Cloud setup, spreadsheet columns, local dev
- [deploy/hostinger-setup.sh](../deploy/hostinger-setup.sh) — automated install script
- [deploy/nginx-snap-expense.conf.example](../deploy/nginx-snap-expense.conf.example) — nginx template
