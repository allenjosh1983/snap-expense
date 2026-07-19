"use client";

import { useState } from "react";
import { CameraCapture } from "@/components/CameraCapture";
import { ReceiptForm } from "@/components/ReceiptForm";
import type { ParsedReceipt, ReceiptSubmission } from "@/lib/types";

type Step = "capture" | "review" | "done";

export default function HomePage() {
  const [step, setStep] = useState<Step>("capture");
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null);
  const [imageBase64, setImageBase64] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);
  const [savedTabName, setSavedTabName] = useState("Receipts");

  async function handleCapture(
    _file: File,
    _previewUrl: string,
    base64: string,
  ) {
    setError(null);
    setScanning(true);
    setImageBase64(base64);

    try {
      const response = await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scan", imageBase64: base64 }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to scan receipt");
      }

      setParsed(data.parsed as ParsedReceipt);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  async function handleSubmit(receipt: ReceiptSubmission) {
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit", receipt }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save receipt");
      }

      setSuccessMessage(data.message || "Receipt saved");
      setSpreadsheetUrl(
        typeof data.spreadsheetUrl === "string" ? data.spreadsheetUrl : null,
      );
      setSavedTabName(
        typeof data.tabName === "string" ? data.tabName : "Receipts",
      );
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  function resetFlow() {
    setStep("capture");
    setParsed(null);
    setImageBase64("");
    setError(null);
    setSuccessMessage("");
    setSpreadsheetUrl(null);
    setSavedTabName("Receipts");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-4 py-8">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          Snap Expense
        </p>
        <h1 className="text-3xl font-bold text-slate-900">
          Receipts to spreadsheet
        </h1>
        <p className="text-slate-600">
          Snap a photo on your phone, review the details, and send it straight
          into your LLC expense sheet for tax time.
        </p>
      </header>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {step === "capture" && (
        <section className="space-y-4">
          <CameraCapture onCapture={handleCapture} disabled={scanning} />
          {scanning && (
            <p className="text-center text-sm text-slate-500">
              Reading receipt with Google Vision...
            </p>
          )}
        </section>
      )}

      {step === "review" && parsed && (
        <ReceiptForm
          initial={parsed}
          imageBase64={imageBase64}
          onSubmit={handleSubmit}
          loading={submitting}
        />
      )}

      {step === "done" && (
        <section className="space-y-4 rounded-2xl bg-emerald-50 p-6 text-center">
          <div className="text-4xl">✓</div>
          <h2 className="text-xl font-semibold text-emerald-900">
            {successMessage}
          </h2>
          <p className="text-sm text-emerald-800">
            Open the{" "}
            <span className="font-semibold">{savedTabName}</span> tab (not
            Sheet1) to see your expense row.
          </p>
          {spreadsheetUrl && (
            <a
              href={spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-2xl border border-emerald-300 bg-white px-6 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              Open Google Sheet
            </a>
          )}
          <button
            type="button"
            onClick={resetFlow}
            className="w-full rounded-2xl bg-emerald-600 px-6 py-4 font-semibold text-white hover:bg-emerald-500"
          >
            Scan another receipt
          </button>
        </section>
      )}

      <footer className="mt-auto rounded-2xl bg-white p-4 text-sm text-slate-500 shadow-sm">
        Tip: add this page to your phone home screen for one-tap receipt capture
        during the day.
      </footer>
    </main>
  );
}
