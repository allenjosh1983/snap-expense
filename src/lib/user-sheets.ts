import { getGoogleAuth } from "./google-auth";
import { getUserAccessToken } from "./google-oauth";
import {
  appendReceiptRow,
  type SheetWriteConfig,
} from "./sheet-write";
import type { ReceiptSubmission } from "./types";
import { OAuth2Client } from "google-auth-library";

const SHEETS_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
];

function createOAuthClient(accessToken: string): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
  }

  const oauth2 = new OAuth2Client(clientId, clientSecret);
  oauth2.setCredentials({ access_token: accessToken });
  return oauth2;
}

export async function appendReceiptToUserSheet(
  email: string,
  config: SheetWriteConfig,
  receipt: ReceiptSubmission,
): Promise<{ imageUrl?: string }> {
  const accessToken = await getUserAccessToken(email);
  const auth = createOAuthClient(accessToken);
  return appendReceiptRow(auth, config, receipt);
}

export async function appendReceiptToLegacySheet(
  receipt: ReceiptSubmission,
): Promise<{ imageUrl?: string }> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  const tabName = process.env.GOOGLE_SHEETS_TAB || "Receipts";

  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEETS_ID is not set");
  }

  const auth = getGoogleAuth(SHEETS_SCOPES);
  const driveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || undefined;

  return appendReceiptRow(
    auth,
    { spreadsheetId, tabName, driveFolderId },
    receipt,
  );
}
