# Snap Expense

Mobile-friendly receipt capture for LLC bookkeeping. Take a photo on your phone, OCR reads the receipt, you confirm the details, and the row lands in your Google Sheet with the receipt image backed up to Drive.

## What it does

1. Open the app on your phone (works in the browser; add to home screen for quick access).
2. Snap or upload a receipt photo.
3. Google Cloud Vision extracts merchant, date, total, tax, and subtotal.
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
- A Google Sheet for your LLC expenses

## Google Cloud setup

### 1. Create a project

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (e.g. `snap-expense-llc`).

### 2. Enable APIs

Enable these APIs for the project:

- Cloud Vision API
- Google Sheets API
- Google Drive API

### 3. Authentication (choose one)

**Local development (recommended when org policy blocks JSON keys)**

If your organization blocks service account key creation (`iam.disableServiceAccountKeyCreation`), use Application Default Credentials with your personal Google account:

1. Install the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install).
2. Run:
   ```bash
   gcloud auth application-default login
   ```
3. Sign in with the Google account that **owns** your expense spreadsheet (e.g. `allenjosh1983@gmail.com`).
4. Leave `GOOGLE_APPLICATION_CREDENTIALS` unset in `.env`.

The app uses ADC automatically when no valid key file is present. Your user account can read/write sheets you own — no service account share needed for local dev.

**Production / Vercel deploy (service account)**

1. IAM & Admin → Service Accounts → Create service account.
2. Create a JSON key and download it (requires org policy that allows key creation).
3. Save it as `credentials/google-service-account.json` (gitignored).
4. Set `GOOGLE_APPLICATION_CREDENTIALS=./credentials/google-service-account.json`.
5. Share the spreadsheet (and optional Drive folder) with the service account email (Editor).

### 4. Share your spreadsheet (service account deploy only)

For **local ADC dev**, skip this — your logged-in user already has access to sheets you own.

For **production** with a service account:

1. Create a Google Sheet (e.g. `LLC Expenses 2026`).
2. Copy the spreadsheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
3. Share the sheet with your service account email (Editor access).
   The email looks like `snap-expense@your-project.iam.gserviceaccount.com`.

### 4b. Optional: receipt image folder

Receipt rows save to Google Sheets even without Drive. Image upload is skipped unless `GOOGLE_DRIVE_FOLDER_ID` is set.

**Service accounts have no personal Drive storage quota.** If you use a service account (production/Vercel), the folder must live in a **Shared Drive** and the service account needs Content manager access on that Shared Drive. Without that, uploads fail with a quota error — the app logs a warning and still saves the sheet row with an empty Image URL column.

**OAuth / ADC (local dev)** can use a regular My Drive folder you own.

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
# Local dev: leave GOOGLE_APPLICATION_CREDENTIALS unset; run gcloud auth application-default login
# Production: GOOGLE_APPLICATION_CREDENTIALS=./credentials/google-service-account.json
GOOGLE_SHEETS_ID=your_spreadsheet_id_here
GOOGLE_SHEETS_TAB=Receipts
# Optional: Shared Drive folder (service account) or My Drive folder (OAuth). Omit to skip images.
GOOGLE_DRIVE_FOLDER_ID=
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

For real phone use outside your home network, deploy to [Vercel](https://vercel.com):

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
  app/
    page.tsx              # Mobile capture flow
    api/receipts/route.ts # Scan + save endpoints
  components/
    CameraCapture.tsx
    ReceiptForm.tsx
  lib/
    ocr.ts                # Google Vision
    parse-receipt.ts      # Receipt field extraction
    sheets.ts             # Google Sheets + Drive
```

## Next steps (optional)

- Auto-suggest category from merchant name
- Monthly summary tab in the spreadsheet
- QuickBooks / Xero export
- Multi-user auth if you have employees submitting receipts
