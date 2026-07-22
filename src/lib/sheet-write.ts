import { Readable } from "stream";
import type { GoogleAuth } from "google-auth-library";
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import type { ReceiptSubmission } from "./types";

export const RECEIPT_HEADERS = [
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
];

export const OCR_ARCHIVE_TAB = "OCR Archive";

export const OCR_ARCHIVE_HEADERS = [
  "Submitted At",
  "Merchant",
  "Date",
  "Raw OCR Text",
];

export type SheetWriteConfig = {
  spreadsheetId: string;
  tabName: string;
  driveFolderId?: string;
};

export async function ensureSheetTab(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  tabName: string,
  headers: string[],
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
      values: [headers],
    },
  });
}

async function uploadReceiptImage(
  drive: ReturnType<typeof google.drive>,
  imageBase64: string | undefined,
  merchant: string,
  date: string,
  folderId: string,
): Promise<string | undefined> {
  if (!imageBase64) return undefined;

  const fileName = `receipt-${date || "unknown"}-${merchant || "expense"}.jpg`.replace(
    /[^\w.\-]+/g,
    "-",
  );

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: "image/jpeg",
      parents: [folderId],
    },
    media: {
      mimeType: "image/jpeg",
      body: Readable.from(Buffer.from(imageBase64, "base64")),
    },
    fields: "id, webViewLink",
  });

  return response.data.webViewLink ?? undefined;
}

export async function appendReceiptRow(
  auth: OAuth2Client | GoogleAuth,
  config: SheetWriteConfig,
  receipt: ReceiptSubmission,
): Promise<{ imageUrl?: string }> {
  const sheets = google.sheets({ version: "v4", auth });
  const { spreadsheetId, tabName, driveFolderId } = config;

  await ensureSheetTab(sheets, spreadsheetId, tabName, RECEIPT_HEADERS);

  let imageUrl: string | undefined;
  const shouldUploadImage = Boolean(receipt.imageBase64) && Boolean(driveFolderId);

  if (shouldUploadImage && driveFolderId) {
    const drive = google.drive({ version: "v3", auth });
    try {
      imageUrl = await uploadReceiptImage(
        drive,
        receipt.imageBase64,
        receipt.merchant,
        receipt.date,
        driveFolderId,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown Drive upload error";
      console.warn(
        `[sheets] Receipt image upload skipped (${message}); saving row without Image URL`,
      );
    }
  }

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
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A:J`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [row],
    },
  });

  const rawText = receipt.rawText?.trim();
  if (rawText) {
    await ensureSheetTab(
      sheets,
      spreadsheetId,
      OCR_ARCHIVE_TAB,
      OCR_ARCHIVE_HEADERS,
    );

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${OCR_ARCHIVE_TAB}!A:D`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [[submittedAt, receipt.merchant, receipt.date, rawText]],
      },
    });
  }

  return { imageUrl };
}
