import { auth } from "@/auth";
import {
  getUserByEmail,
  hasSheetConfigured,
  updateUserSheetConfig,
} from "@/lib/db";
import { parseDriveFolderId, parseSpreadsheetId } from "@/lib/spreadsheet-id";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = getUserByEmail(email);
  const spreadsheetId = user?.spreadsheetId ?? null;

  return NextResponse.json({
    spreadsheetId,
    spreadsheetUrl: spreadsheetId
      ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
      : null,
    tabName: user?.tabName ?? "Receipts",
    driveFolderId: user?.driveFolderId ?? null,
    configured: hasSheetConfigured(email),
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const spreadsheetInput = String(body.spreadsheetUrl ?? body.spreadsheetId ?? "");
    const tabName = String(body.tabName ?? "Receipts").trim() || "Receipts";
    const driveFolderInput = body.driveFolderId
      ? String(body.driveFolderId)
      : "";

    const spreadsheetId = parseSpreadsheetId(spreadsheetInput);
    if (!spreadsheetId) {
      return NextResponse.json(
        { error: "Enter a valid Google Sheets URL or spreadsheet ID" },
        { status: 400 },
      );
    }

    const driveFolderId = driveFolderInput
      ? parseDriveFolderId(driveFolderInput)
      : null;

    if (driveFolderInput && !driveFolderId) {
      return NextResponse.json(
        { error: "Enter a valid Google Drive folder URL or folder ID" },
        { status: 400 },
      );
    }

    const user = updateUserSheetConfig(email, {
      spreadsheetId,
      tabName,
      driveFolderId,
    });

    return NextResponse.json({
      ok: true,
      spreadsheetId: user.spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      tabName: user.tabName,
      driveFolderId: user.driveFolderId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
