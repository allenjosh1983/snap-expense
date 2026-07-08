import type { ParsedReceipt } from "./types";

const DATE_PATTERNS = [
  /\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\b/,
  /\b(\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2})\b/,
  /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{2,4}\b/i,
];

const TOTAL_KEYWORDS =
  /(?:^|\s)(?:total|amount due|balance due|grand total|total due)(?:\s|:|\$)/i;

const SUBTOTAL_KEYWORDS = /(?:^|\s)(?:subtotal|sub-total|sub total)(?:\s|:|\$)/i;
const TAX_KEYWORDS = /(?:^|\s)(?:tax|sales tax|vat|hst|gst)(?:\s|:|\$)/i;

function parseMoney(value: string): number | null {
  const cleaned = value.replace(/[^0-9.\-]/g, "");
  if (!cleaned) return null;
  const amount = Number.parseFloat(cleaned);
  return Number.isFinite(amount) ? amount : null;
}

function findAmountOnLine(line: string): number | null {
  const matches = [...line.matchAll(/\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})|\d+\.\d{2})/g)];
  if (matches.length === 0) return null;
  const last = matches[matches.length - 1][1];
  return parseMoney(last);
}

function findKeywordAmount(lines: string[], keyword: RegExp): number | null {
  for (const line of lines) {
    if (keyword.test(line)) {
      const amount = findAmountOnLine(line);
      if (amount !== null) return amount;
    }
  }
  return null;
}

function findDate(text: string): string {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  return "";
}

function guessMerchant(lines: string[]): string {
  const candidates = lines
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length >= 3 &&
        line.length <= 60 &&
        !/receipt|invoice|welcome|thank you|tel|phone|www\./i.test(line) &&
        !/^\d/.test(line),
    );

  return candidates[0] ?? "";
}

function findTotal(lines: string[]): number | null {
  const keywordTotal = findKeywordAmount(lines, TOTAL_KEYWORDS);
  if (keywordTotal !== null) return keywordTotal;

  const amounts = lines
    .map(findAmountOnLine)
    .filter((value): value is number => value !== null);

  if (amounts.length === 0) return null;
  return Math.max(...amounts);
}

export function parseReceiptText(rawText: string): ParsedReceipt {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const total = findTotal(lines);
  const subtotal = findKeywordAmount(lines, SUBTOTAL_KEYWORDS);
  const tax = findKeywordAmount(lines, TAX_KEYWORDS);
  const merchant = guessMerchant(lines);
  const date = findDate(rawText);

  let confidence: ParsedReceipt["confidence"] = "low";
  if (merchant && date && total !== null) confidence = "high";
  else if ((merchant || date) && total !== null) confidence = "medium";

  return {
    merchant,
    date,
    total,
    subtotal,
    tax,
    currency: /\$|USD/i.test(rawText) ? "USD" : "USD",
    rawText,
    confidence,
  };
}
