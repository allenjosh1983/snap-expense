import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { extractReceiptFromImage } from "@/lib/ocr";
import { appendReceiptToUserSheet } from "@/lib/user-sheets";
import { getUserSheetConfig } from "@/lib/db";
import { EXPENSE_CATEGORIES, type ReceiptSubmission } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const email = session?.user?.email;

    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sheetConfig = getUserSheetConfig(email);
    if (!sheetConfig) {
      return NextResponse.json(
        { error: "Spreadsheet not configured. Visit Settings first." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const action = body.action as "scan" | "submit";

    if (action === "scan") {
      const imageBase64 = body.imageBase64 as string | undefined;
      if (!imageBase64) {
        return NextResponse.json(
          { error: "imageBase64 is required" },
          { status: 400 },
        );
      }

      const parsed = await extractReceiptFromImage(imageBase64);
      return NextResponse.json({ parsed });
    }

    if (action === "submit") {
      const receipt = body.receipt as ReceiptSubmission | undefined;
      if (!receipt) {
        return NextResponse.json(
          { error: "receipt payload is required" },
          { status: 400 },
        );
      }

      if (!receipt.merchant?.trim()) {
        return NextResponse.json(
          { error: "Merchant is required" },
          { status: 400 },
        );
      }

      if (!receipt.date?.trim()) {
        return NextResponse.json(
          { error: "Date is required" },
          { status: 400 },
        );
      }

      if (!Number.isFinite(receipt.total) || receipt.total <= 0) {
        return NextResponse.json(
          { error: "Total must be a positive number" },
          { status: 400 },
        );
      }

      if (!EXPENSE_CATEGORIES.includes(receipt.category)) {
        return NextResponse.json(
          { error: "Invalid expense category" },
          { status: 400 },
        );
      }

      const result = await appendReceiptToUserSheet(
        email,
        sheetConfig,
        receipt,
      );
      const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${sheetConfig.spreadsheetId}/edit`;

      return NextResponse.json({
        ok: true,
        message: `Receipt saved to the "${sheetConfig.tabName}" tab`,
        tabName: sheetConfig.tabName,
        spreadsheetUrl,
        imageUrl: result.imageUrl,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    console.error("[receipts]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
