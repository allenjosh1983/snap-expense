import { appendReceiptToLegacySheet } from "./user-sheets";
import type { ReceiptSubmission } from "./types";

/** @deprecated Use appendReceiptToUserSheet for multi-tenant auth. */
export async function appendReceiptToSheet(
  receipt: ReceiptSubmission,
): Promise<{ imageUrl?: string }> {
  return appendReceiptToLegacySheet(receipt);
}

export { appendReceiptToUserSheet } from "./user-sheets";
