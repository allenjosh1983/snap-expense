const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const { GoogleAuth } = require("google-auth-library");

const RECEIPTS_TAB = "Receipts";
const OCR_ARCHIVE_TAB = "OCR Archive";

const TEST_MERCHANTS = new Set(
  ["ADC Test Merchant", "API Test Merchant", "Final Verify"].map((s) =>
    s.toLowerCase(),
  ),
);

const TEST_NOTE_PATTERNS = [
  /test-adc-submit/i,
  /api submit test/i,
  /test row from scripts/i,
  /test from curl/i,
  /snap-expense adc local dev test/i,
];

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

function isTestReceiptRow(row) {
  const merchant = (row[2] ?? "").trim();
  const notes = (row[8] ?? "").trim();

  if (TEST_MERCHANTS.has(merchant.toLowerCase())) {
    return true;
  }

  if (TEST_NOTE_PATTERNS.some((pattern) => pattern.test(notes))) {
    return true;
  }

  return false;
}

function rowKey(submittedAt, merchant, date) {
  return `${submittedAt.trim()}|${merchant.trim()}|${date.trim()}`;
}

async function deleteRowsByIndex(
  sheets,
  spreadsheetId,
  sheetId,
  rowIndices1Based,
  tabLabel,
) {
  if (rowIndices1Based.length === 0) return 0;

  const sorted = [...rowIndices1Based].sort((a, b) => b - a);
  const requests = sorted.map((rowIndex) => ({
    deleteDimension: {
      range: {
        sheetId,
        dimension: "ROWS",
        startIndex: rowIndex - 1,
        endIndex: rowIndex,
      },
    },
  }));

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests },
  });

  console.log(`Deleted ${sorted.length} row(s) from "${tabLabel}"`);
  return sorted.length;
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), ".env"));

  const spreadsheetId =
    process.env.GOOGLE_SHEETS_ID ??
    "1DnzD0Yn_48ZtD00FyfaGHUMer-7Lle3j6YHu53EAZkg";
  process.env.GOOGLE_APPLICATION_CREDENTIALS ??=
    "credentials/google-service-account.json";

  const auth = getGoogleAuth(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheets = google.sheets({ version: "v4", auth });

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetByTitle = new Map(
    (meta.data.sheets ?? [])
      .filter((s) => s.properties?.title && s.properties.sheetId != null)
      .map((s) => [s.properties.title, s.properties.sheetId]),
  );

  const receiptsSheetId = sheetByTitle.get(RECEIPTS_TAB);
  if (receiptsSheetId == null) {
    throw new Error(`Tab "${RECEIPTS_TAB}" not found`);
  }

  const receiptsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${RECEIPTS_TAB}!A:J`,
  });
  const receiptRows = receiptsRes.data.values ?? [];

  if (receiptRows.length <= 1) {
    console.log("No data rows in Receipts tab.");
    return;
  }

  const header = receiptRows[0];
  const dataRows = receiptRows.slice(1);

  const toDelete = [];
  const toKeep = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const sheetRow = i + 2;
    if (isTestReceiptRow(row)) {
      toDelete.push({ sheetRow, row });
    } else {
      toKeep.push({ sheetRow, row });
    }
  }

  console.log("\n=== Receipts tab analysis ===");
  console.log(`Header: ${header.join(" | ")}`);
  console.log(`Total data rows: ${dataRows.length}`);
  console.log(`To delete (TEST): ${toDelete.length}`);
  console.log(`To keep (real): ${toKeep.length}`);

  if (toDelete.length > 0) {
    console.log("\n--- Rows to DELETE ---");
    for (const { sheetRow, row } of toDelete) {
      console.log(
        `Row ${sheetRow}: ${row[0]} | ${row[1]} | ${row[2]} | $${row[3]} | notes: ${row[8] ?? ""}`,
      );
    }
  }

  if (toKeep.length > 0) {
    console.log("\n--- Rows to KEEP ---");
    for (const { sheetRow, row } of toKeep) {
      console.log(
        `Row ${sheetRow}: ${row[0]} | ${row[1]} | ${row[2]} | $${row[3]} | notes: ${row[8] ?? ""}`,
      );
    }
  }

  const deleteKeys = new Set(
    toDelete.map(({ row }) => rowKey(row[0] ?? "", row[2] ?? "", row[1] ?? "")),
  );

  let ocrDeleteRows = [];
  const ocrSheetId = sheetByTitle.get(OCR_ARCHIVE_TAB);

  if (ocrSheetId != null) {
    const ocrRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${OCR_ARCHIVE_TAB}!A:D`,
    });
    const ocrRows = ocrRes.data.values ?? [];

    for (let i = 1; i < ocrRows.length; i++) {
      const row = ocrRows[i];
      const key = rowKey(row[0] ?? "", row[1] ?? "", row[2] ?? "");
      if (deleteKeys.has(key)) {
        ocrDeleteRows.push({ sheetRow: i + 1, row });
      }
    }

    console.log(`\n=== OCR Archive tab ===`);
    console.log(`Matching OCR rows to delete: ${ocrDeleteRows.length}`);
    for (const { sheetRow, row } of ocrDeleteRows) {
      const preview = (row[3] ?? "").slice(0, 60);
      console.log(
        `Row ${sheetRow}: ${row[0]} | ${row[1]} | ${row[2]} | OCR: ${preview}${(row[3] ?? "").length > 60 ? "..." : ""}`,
      );
    }
  } else {
    console.log(`\nTab "${OCR_ARCHIVE_TAB}" not found — skipping OCR cleanup.`);
  }

  if (toDelete.length === 0 && ocrDeleteRows.length === 0) {
    console.log("\nNothing to delete.");
    return;
  }

  console.log("\n=== Deleting rows ===");

  const deletedReceipts = await deleteRowsByIndex(
    sheets,
    spreadsheetId,
    receiptsSheetId,
    toDelete.map((r) => r.sheetRow),
    RECEIPTS_TAB,
  );

  let deletedOcr = 0;
  if (ocrSheetId != null && ocrDeleteRows.length > 0) {
    deletedOcr = await deleteRowsByIndex(
      sheets,
      spreadsheetId,
      ocrSheetId,
      ocrDeleteRows.map((r) => r.sheetRow),
      OCR_ARCHIVE_TAB,
    );
  }

  console.log("\n=== Summary ===");
  console.log(`Receipts deleted: ${deletedReceipts}`);
  console.log(`Receipts kept: ${toKeep.length}`);
  console.log(`OCR Archive deleted: ${deletedOcr}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("FAILED:", message);
  process.exit(1);
});
