import fs from "fs";
import path from "path";
import { google } from "googleapis";
import { getGoogleAuth } from "../src/lib/google-auth";

function loadEnvFile(envPath: string): void {
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

async function main(): Promise<void> {
  loadEnvFile(path.resolve(process.cwd(), ".env"));

  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  const tabName = process.env.GOOGLE_SHEETS_TAB || "Receipts";

  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEETS_ID is not set");
  }

  const auth = getGoogleAuth(["https://www.googleapis.com/auth/spreadsheets.readonly"]);
  const sheets = google.sheets({ version: "v4", auth });

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const tabTitles = meta.data.sheets?.map((s) => s.properties?.title) ?? [];
  console.log("Spreadsheet tabs:", tabTitles.join(", "));

  for (const title of tabTitles) {
    if (!title) continue;
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${title}!A:K`,
    });
    const rows = res.data.values ?? [];
    console.log(`\n--- ${title} (${rows.length} rows) ---`);
    const preview = rows.slice(0, 3);
    for (const row of preview) {
      console.log(row.join(" | "));
    }
    if (rows.length > 3) {
      console.log("...");
      for (const row of rows.slice(-3)) {
        console.log(row.join(" | "));
      }
    }
  }

  const receipts = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tabName}!A:K`,
  });
  const receiptRows = receipts.data.values ?? [];
  console.log(`\nConfigured tab "${tabName}": ${Math.max(0, receiptRows.length - 1)} data rows`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("FAILED:", message);
  process.exit(1);
});
