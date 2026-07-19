const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const { GoogleAuth } = require("google-auth-library");

const OCR_ARCHIVE_TAB = "OCR Archive";
const OCR_ARCHIVE_HEADERS = [
  "Submitted At",
  "Merchant",
  "Date",
  "Raw OCR Text",
];

const SPREADSHEET_ID = "1DnzD0Yn_48ZtD00FyfaGHUMer-7Lle3j6YHu53EAZkg";

const MERCHANT = "O'Reilly";
const DATE = "07/18/2026";
const RAW_OCR_TEXT = `O'Reilly
PROFESSIONAL PARTS PEOPLE
6227 TROOST AVENUE
KANSAS CITY, MO 64110
(816) 361-9017
www.oreillyauto.com
Store hours:
Mon-Sat: 07:30 AM-08:00 PM
08:00 AM-07:00 PM
Sun:
Counter #: 838122
Charlie
Date: 07/18/2026 03:54 PM
Drawer: 3
Invoice #: 139-292386
139WS146
SYL H11BP
CAPSULE
1 Item
19.99 T
Sub-Total
19.99
Sales Tax
1.89
21.88
Total
21.88
DB 6008
DB XXXXXXXXXXXX6008 Auth CD: 790675
REP# 996087075846
Verified by PIN`;

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function resolveKeyFile() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath) return undefined;

  const resolved = path.isAbsolute(credentialsPath)
    ? credentialsPath
    : path.resolve(process.cwd(), credentialsPath);

  try {
    const stat = fs.statSync(resolved);
    if (stat.isFile() && stat.size > 0) {
      return resolved;
    }
  } catch {
    // fall back to ADC
  }

  return undefined;
}

function getGoogleAuth(scopes) {
  const keyFile = resolveKeyFile();
  if (keyFile) {
    return new GoogleAuth({ keyFile, scopes });
  }
  return new GoogleAuth({ scopes });
}

function normalizeText(text) {
  return text.trim().replace(/\s+/g, " ");
}

function extractInvoiceNumber(text) {
  const match = text.match(/Invoice #:\s*([\d-]+)/i);
  return match?.[1];
}

function isDuplicateOcrRow(row, merchant, date, rawText) {
  const [, rowMerchant = "", rowDate = "", rowText = ""] = row;
  if (rowMerchant.trim().toLowerCase() !== merchant.trim().toLowerCase()) {
    return false;
  }
  if (rowDate.trim() !== date.trim()) {
    return false;
  }

  const normalizedIncoming = normalizeText(rawText);
  const normalizedExisting = normalizeText(rowText);
  if (normalizedIncoming === normalizedExisting) {
    return true;
  }

  const incomingInvoice = extractInvoiceNumber(rawText);
  const existingInvoice = extractInvoiceNumber(rowText);
  if (incomingInvoice && existingInvoice && incomingInvoice === existingInvoice) {
    return true;
  }

  const shorter =
    normalizedIncoming.length <= normalizedExisting.length
      ? normalizedIncoming
      : normalizedExisting;
  const longer =
    normalizedIncoming.length <= normalizedExisting.length
      ? normalizedExisting
      : normalizedIncoming;
  if (shorter.length >= 80 && longer.includes(shorter.slice(0, 80))) {
    return true;
  }

  return false;
}

async function ensureSheetTab(sheets, spreadsheetId, tabName, headers) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = meta.data.sheets?.find(
    (sheet) => sheet.properties?.title === tabName,
  );

  if (existing) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: { title: tabName },
          },
        },
      ],
    },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabName}!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [headers],
    },
  });
}

async function ensureHeaders(sheets, spreadsheetId, tabName, headers) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tabName}!A1:D1`,
  });
  const existing = res.data.values?.[0] ?? [];
  if (existing.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tabName}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [headers] },
    });
  }
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), ".env"));
  process.env.GOOGLE_APPLICATION_CREDENTIALS ??=
    "credentials/google-service-account.json";

  const auth = getGoogleAuth(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheets = google.sheets({ version: "v4", auth });

  await ensureSheetTab(
    sheets,
    SPREADSHEET_ID,
    OCR_ARCHIVE_TAB,
    OCR_ARCHIVE_HEADERS,
  );
  await ensureHeaders(
    sheets,
    SPREADSHEET_ID,
    OCR_ARCHIVE_TAB,
    OCR_ARCHIVE_HEADERS,
  );

  const existingRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${OCR_ARCHIVE_TAB}!A:D`,
  });
  const existingRows = existingRes.data.values ?? [];

  for (let i = 1; i < existingRows.length; i++) {
    if (isDuplicateOcrRow(existingRows[i], MERCHANT, DATE, RAW_OCR_TEXT)) {
      const row = existingRows[i];
      console.log("SKIPPED: duplicate OCR row already exists");
      console.log(`Existing row ${i + 1}: ${row[0]} | ${row[1]} | ${row[2]}`);
      console.log(`OCR preview: ${(row[3] ?? "").slice(0, 80)}...`);
      return;
    }
  }

  const submittedAt = new Date().toISOString();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${OCR_ARCHIVE_TAB}!A:D`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [[submittedAt, MERCHANT, DATE, RAW_OCR_TEXT]],
    },
  });

  console.log("SUCCESS: appended OCR row to OCR Archive");
  console.log(`Submitted At: ${submittedAt}`);
  console.log(`Merchant: ${MERCHANT}`);
  console.log(`Date: ${DATE}`);
  console.log(`Raw OCR Text length: ${RAW_OCR_TEXT.length} chars`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("FAILED:", message);
  process.exit(1);
});
