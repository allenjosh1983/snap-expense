# Snap Expense

Mobile-friendly receipt capture for LLC bookkeeping. Take a photo on your phone, OCR reads the receipt, you confirm the details, and the row lands in your Google Sheet with the receipt image backed up to Drive.

## What it does

1. Open the app on your phone (works in the browser; add to home screen for quick access).
2. Snap or upload a receipt photo.
3. Google Cloud Vision (document text detection, English) extracts merchant, date, total, tax, and subtotal.
4. You review and categorize the expense (with a tax-deductible flag).
5. The app appends a row to your Google Sheet. Receipt images are optionally backed up to Google Drive when configured.

## Spreadsheet tabs

### Receipts (main tab)

Clean expense rows for bookkeeping — no multi-line OCR text in this view.

| Column | Example |
|--------|---------|
| Submitted At | 2026-07-01T14:22:00Z |
| Date | 06/28/2026 |
| Merchant | Home Depot |
| Total | 47.83 |
| Subtotal | 44.00 |
| Tax | 3.83 |
| Category | Office Supplies |
| Deductible | Yes |
| Notes | Paint for office refresh |
| Image URL | Drive link |

### OCR Archive (auto-created)

Full scanned text is stored here so the Receipts tab stays compact. Created automatically on first submit that includes OCR text.

| Column | Example |
|--------|---------|
| Submitted At | 2026-07-01T14:22:00Z |
| Merchant | Home Depot |
| Date | 06/28/2026 |
| Raw OCR Text | Full multi-line receipt scan |

Existing spreadsheets that already have a **Raw OCR Text** column on Receipts are unaffected — new rows simply stop writing to that column.

## Prerequisites

- [Node.js 20+](https://nodejs.org/) (includes npm)
- A Google Cloud project with billing enabled
- A Google OAuth web client for sign-in (see [Google OAuth setup](#google-oauth-setup-multi-tenant))
- A Google Sheet for your LLC expenses (each user connects their own after sign-in)

## Google OAuth setup (multi-tenant)

Each user signs in with Google and saves receipts to **their own** spreadsheet. Vision OCR still uses the service account (or ADC); Sheets and Drive use the signed-in user's OAuth token.

### 1. OAuth consent screen

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **OAuth consent screen**.
2. Choose **External** (or Internal if using Google Workspace).
3. Add app name, support email, and your email as developer contact.
4. Add scopes:
   - `openid`, `email`, `profile`
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/drive.file`
5. Add test users while the app is in **Testing** mode (each Google account that will sign in).

### 2. OAuth web client

1. **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**.
2. Application type: **Web application**.
3. Authorized redirect URIs:
   - Production: `https://expenses.jallendevworks.cloud/api/auth/callback/google`
   - Local dev: `http://localhost:3001/api/auth/callback/google`
4. Copy **Client ID** and **Client secret** into `.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

### 3. Auth environment variables

```env
AUTH_SECRET=your_random_secret   # openssl rand -base64 32
AUTH_URL=https://expenses.jallendevworks.cloud
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
# DATABASE_PATH=./data/users.sqlite   # optional; default ./data/users.sqlite
```

Generate `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

On first sign-in, users land on **Settings** to paste their Google Sheet URL. The app stores `email → spreadsheetId, tabName, driveFolderId` in SQLite.

## Google Cloud setup

### 1. Create a project

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (e.g. `snap-expense-llc`).

### 2. Enable APIs

Enable these APIs for the project:

- Cloud Vision API (document text detection for receipt OCR)
- Google Sheets API
- Google Drive API

### 3. Authentication

**Vision OCR (service account or ADC)**

Vision document text detection uses `GOOGLE_APPLICATION_CREDENTIALS` (production) or Application Default Credentials (local dev). This is separate from user sign-in.

**Local development (ADC when org policy blocks JSON keys)**

If your organization blocks service account key creation (`iam.disableServiceAccountKeyCreation`), use Application Default Credentials with your personal Google account:

1. Install the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install).
2. Run:
   ```bash
   gcloud auth application-default login
   ```
3. Sign in with the Google account that **owns** your expense spreadsheet (e.g. `allenjosh1983@gmail.com`).
4. Leave `GOOGLE_APPLICATION_CREDENTIALS` unset in `.env`.

The app uses ADC automatically when no valid key file is present. Your user account can read/write sheets you own — no service account share needed for local dev.

**Production / VPS (service account for Vision only)**

1. IAM & Admin → Service Accounts → Create service account.
2. Create a JSON key and download it (requires org policy that allows key creation).
3. Save it as `credentials/google-service-account.json` (gitignored).
4. Set `GOOGLE_APPLICATION_CREDENTIALS=./credentials/google-service-account.json`.

Sheets and Drive writes use each user's OAuth token after sign-in — you do **not** need to share spreadsheets with the service account for normal multi-tenant use.

**Legacy single-tenant fallback**

If `GOOGLE_SHEETS_ID` is set and you are not using auth, the old service-account path still works via `appendReceiptToLegacySheet`. Prefer per-user settings for production.

### 4. Per-user spreadsheet (after sign-in)

1. Sign in with Google at `/login`.
2. On first visit, open **Settings** and paste your Google Sheet URL.
3. Optionally set a Drive folder for receipt image backups.

Each user's sheet must be owned by (or shared with) the Google account they used to sign in.

### 4b. Optional: receipt image folder (per user in Settings)

Receipt rows save to Google Sheets even without Drive. Image upload is skipped unless a Drive folder is configured in **Settings** (or legacy `GOOGLE_DRIVE_FOLDER_ID`).

1. Create a folder (Shared Drive for service accounts, or My Drive for OAuth).
2. Share it with your service account (Editor) or use your own account via ADC.
3. Copy the folder ID from the URL and set `GOOGLE_DRIVE_FOLDER_ID`.

Leave `GOOGLE_DRIVE_FOLDER_ID` unset to skip image uploads entirely.

## Local setup

```bash
cd C:\Users\5540\Projects\snap-expense
npm install
copy .env.example .env
```

Edit `.env`:

```env
AUTH_SECRET=...
AUTH_URL=http://localhost:3001
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=

# Vision OCR: leave GOOGLE_APPLICATION_CREDENTIALS unset; run gcloud auth application-default login
# GOOGLE_APPLICATION_CREDENTIALS=./credentials/google-service-account.json

# Legacy single-tenant only (optional):
# GOOGLE_SHEETS_ID=your_spreadsheet_id_here
# GOOGLE_SHEETS_TAB=Receipts
# GOOGLE_DRIVE_FOLDER_ID=
```

Run the dev server:

```bash
npm run dev
```

Open `http://localhost:3001` on your PC.

## Testing on iPhone

Safari on iPhone **requires HTTPS** for the camera. A local IP like `http://10.14.0.2:3001` shows **Not Secure** and blocks the camera. Self-signed certificates (`next dev --experimental-https`) also fail on iPhone — Safari won't let you trust them for camera access.

**Recommended: Cloudflare Quick Tunnel (free, no account)**

This gives you a real HTTPS URL that Safari trusts, so the camera works.

1. Start the dev server (terminal 1):

   ```bash
   npm run dev
   ```

2. Start the tunnel (terminal 2):

   ```bash
   npm run tunnel
   ```

   On first run, `cloudflared` is downloaded automatically into `tools/` (gitignored).

3. Copy the `https://….trycloudflare.com` URL from the terminal output and open it in Safari on your iPhone.

4. Allow camera access when prompted.

**Security warning:** The tunnel URL is **public to anyone with the link** — not limited to your Wi‑Fi. Use it only for short testing sessions. Each run gets a new random URL; stop the tunnel when you're done.

**Alternatives if the tunnel fails**

- [ngrok](https://ngrok.com): `ngrok http 3001` (free tier requires signup)
- Deploy a [Vercel](https://vercel.com) preview — see [Deploying for daily use](#deploying-for-daily-use) below

## Deploying for daily use

### Hostinger VPS (stable domain, no tunnel)

For a fixed HTTPS URL on your own server (recommended if you have a Hostinger VPS):

1. Follow **[docs/DEPLOY-VPS.md](docs/DEPLOY-VPS.md)** — SSH, `.env`, credentials upload, PM2, nginx, and Let's Encrypt.
2. Point your domain's A record at the VPS IP.
3. Open your production URL on your phone and "Add to Home Screen".

Quick start on the server after cloning:

```bash
chmod +x deploy/hostinger-setup.sh
./deploy/hostinger-setup.sh
```

### Vercel

For real phone use without managing a server, deploy to [Vercel](https://vercel.com):

1. Push this repo to GitHub.
2. Import the project in Vercel.
3. Add the same environment variables in Vercel project settings.
4. Upload the service account JSON as an env var or use Vercel's secret file storage.
5. Open your production URL on your phone and "Add to Home Screen".

## Tax workflow tips

- Use **Category** consistently so you can pivot/filter at year end.
- Keep **Notes** for business purpose (helpful for meals, travel, mixed use).
- The **Deductible** column makes it easy to filter Schedule C–style expenses.
- Receipt images in Drive (when configured) give you an audit trail if the IRS asks for proof. Rows without an Image URL still capture all expense fields.

## Project structure

```
src/
  auth.ts                 # NextAuth (Google OAuth)
  middleware.ts           # Protect routes
  app/
    page.tsx              # Server redirect + home
    HomePageClient.tsx    # Mobile capture flow
    login/page.tsx        # Sign in with Google
    settings/page.tsx     # Spreadsheet onboarding
    api/auth/[...nextauth]/route.ts
    api/settings/route.ts
    api/receipts/route.ts # Scan + save endpoints
  components/
    AppHeader.tsx         # Email, Settings, Sign out
    Providers.tsx         # SessionProvider
    CameraCapture.tsx
    ReceiptForm.tsx
  lib/
    db.ts                 # SQLite user store
    google-oauth.ts       # Refresh user access tokens
    user-sheets.ts        # Per-user sheet writes
    sheet-write.ts        # Shared append logic
    ocr.ts                # Google Vision (service account)
    parse-receipt.ts      # Receipt field extraction
    sheets.ts             # Legacy export shim
```

## Next steps (optional)

- Auto-suggest category from merchant name
- Monthly summary tab in the spreadsheet
- QuickBooks / Xero export
