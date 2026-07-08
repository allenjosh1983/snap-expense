# Snap Expense

Mobile-friendly receipt capture for LLC bookkeeping. Take a photo on your phone, OCR reads the receipt, you confirm the details, and the row lands in your Google Sheet with the receipt image backed up to Drive.

## What it does

1. Open the app on your phone (works in the browser; add to home screen for quick access).
2. Snap or upload a receipt photo.
3. Google Cloud Vision extracts merchant, date, total, tax, and subtotal.
4. You review and categorize the expense (with a tax-deductible flag).
5. The app appends a row to your Google Sheet and optionally stores the image in Google Drive.

## Spreadsheet columns

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
| Raw OCR Text | Full scanned text |

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

### 3. Create a service account

1. IAM & Admin → Service Accounts → Create service account.
2. Grant it no extra roles for now (API access is via the JSON key).
3. Create a JSON key and download it.
4. Save it as `credentials/google-service-account.json` (this path is gitignored).

### 4. Share your spreadsheet

1. Create a Google Sheet (e.g. `LLC Expenses 2026`).
2. Copy the spreadsheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
3. Share the sheet with your service account email (Editor access).
   The email looks like `snap-expense@your-project.iam.gserviceaccount.com`.

### 4b. Optional: receipt image folder

1. Create a folder in Google Drive (e.g. `LLC Receipts 2026`).
2. Share that folder with the same service account (Editor).
3. Copy the folder ID from the URL and set `GOOGLE_DRIVE_FOLDER_ID`.

## Local setup

```bash
cd C:\Users\5540\Projects\snap-expense
npm install
copy .env.example .env
```

Edit `.env`:

```env
GOOGLE_APPLICATION_CREDENTIALS=./credentials/google-service-account.json
GOOGLE_SHEETS_ID=your_spreadsheet_id_here
GOOGLE_SHEETS_TAB=Receipts
GOOGLE_DRIVE_FOLDER_ID=optional_folder_id
```

Run the dev server:

```bash
npm run dev
```

Open `http://localhost:3000` on your phone (same Wi‑Fi) or deploy to Vercel.

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
- Receipt images in Drive give you an audit trail if the IRS asks for proof.

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
