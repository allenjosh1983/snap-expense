import fs from "fs";
import path from "path";
import { appendReceiptToSheet } from "../src/lib/sheets";

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

  const result = await appendReceiptToSheet({
    merchant: "ADC Test Merchant",
    date: "07/17/2026",
    total: 1.23,
    subtotal: 1.0,
    tax: 0.23,
    category: "Other",
    notes: "snap-expense ADC local dev test",
    deductible: false,
    rawText: "Test row from scripts/test-adc-submit.ts",
  });

  console.log("SUCCESS: Receipt appended via ADC");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("FAILED:", message);
  process.exit(1);
});
