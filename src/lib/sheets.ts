import { Readable } from "stream";
import { google } from "googleapis";
import type { ReceiptSubmission } from "./types";

const HEADERS = [
  "Submitted At",
  "Date",
  "Merchant",
  "Total",
  "Subtotal",
  "Tax",
  "Category",
  "Deductible",
  "Notes",
  "Image URL",
  "Raw OCR Text",
];

function getAuth() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS is not set");
  }

  return new google.auth.GoogleAuth({
    keyFile: credentialsPath,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.file",
    ],
  });
}

async function ensureSheetTab(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  tabName: string,
): Promise<void> {
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
      values: [HEADERS],
    },
  });
}

async function uploadReceiptImage(
  drive: ReturnType<typeof google.drive>,
  imageBase64: string | undefined,
  merchant: string,
  date: string,
): Promise<string | undefined> {
  if (!imageBase64) return undefined;

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const fileName = `receipt-${date || "unknown"}-${merchant || "expense"}.jpg`.replace(
    /[^\w.\-]+/g,
    "-",
  );

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: "image/jpeg",
      ...(folderId ? { parents: [folderId] } : {}),
    },
    media: {
      mimeType: "image/jpeg",
      body: Readable.from(Buffer.from(imageBase64, "base64")),
    },
    fields: "id, webViewLink",
  });

  return response.data.webViewLink ?? undefined;
}

export async function appendReceiptToSheet(
  receipt: ReceiptSubmission,
): Promise<{ imageUrl?: string }> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  const tabName = process.env.GOOGLE_SHEETS_TAB || "Receipts";

  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEETS_ID is not set");
  }

  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const drive = google.drive({ version: "v3", auth });

  await ensureSheetTab(sheets, spreadsheetId, tabName);

  const imageUrl = await uploadReceiptImage(
    drive,
    receipt.imageBase64,
    receipt.merchant,
    receipt.date,
  );

  const submittedAt = new Date().toISOString();
  const row = [
    submittedAt,
    receipt.date,
    receipt.merchant,
    receipt.total,
    receipt.subtotal ?? "",
    receipt.tax ?? "",
    receipt.category,
    receipt.deductible ? "Yes" : "No",
    receipt.notes ?? "",
    imageUrl ?? "",
    receipt.rawText ?? "",
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A:K`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [row],
    },
  });

  return { imageUrl };
}
