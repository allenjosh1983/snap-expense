"use client";

import { useState } from "react";
import { CameraCapture } from "@/components/CameraCapture";
import { ReceiptForm } from "@/components/ReceiptForm";
import type { ParsedReceipt, ReceiptSubmission } from "@/lib/types";

type Step = "capture" | "review" | "done";

const PUBLIC_SPREADSHEET_URL =
  process.env.NEXT_PUBLIC_SPREADSHEET_URL?.trim() || null;

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Snap",
    description: "Photograph or upload a receipt",
  },
  {
    step: "2",
    title: "Review",
    description: "Verify amounts and category",
  },
  {
    step: "3",
    title: "Save",
    description: "Row added to your expense sheet",
  },
] as const;

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
  const [captureKey, setCaptureKey] = useState(0);

  const sheetLink = spreadsheetUrl ?? PUBLIC_SPREADSHEET_URL;

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
    setCaptureKey((key) => key + 1);
  }

  function handleRetakePhoto() {
    setStep("capture");
    setParsed(null);
    setImageBase64("");
    setError(null);
    setScanning(false);
    setCaptureKey((key) => key + 1);
  }

  function dismissError() {
    setError(null);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3.5">
          <button
            type="button"
            onClick={resetFlow}
            aria-label="Go to home"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-sm font-bold text-white transition hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          >
            SE
          </button>
          <div>
            <p className="text-sm font-semibold text-slate-900">Snap Expense</p>
            <p className="text-xs text-slate-500">Expense tracking on the go</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 pb-8">
        {step === "capture" && (
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Receipt to spreadsheet
            </h1>
            <p className="text-sm leading-relaxed text-slate-600">
              Capture receipts on the go and log them to your Google Sheet for
              tax-ready expense records.
            </p>
          </div>
        )}

        {step === "review" && (
          <StepIndicator current="review" />
        )}

        {error && (
          <div className="error-banner" role="alert">
            <AlertIcon />
            <div className="flex-1 space-y-0.5">
              <p className="font-medium">Something went wrong</p>
              <p>{error}</p>
            </div>
            <button
              type="button"
              onClick={dismissError}
              aria-label="Dismiss error"
              className="shrink-0 rounded-md p-1 text-rose-600 transition hover:bg-rose-100"
            >
              <CloseIcon />
            </button>
          </div>
        )}

        {step === "capture" && (
          <>
            <section className="space-y-4">
              <CameraCapture
                key={captureKey}
                onCapture={handleCapture}
                disabled={scanning}
              />
              {scanning && (
                <div className="loading-panel">
                  <span className="spinner" aria-hidden />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-900">
                      Reading receipt…
                    </p>
                    <p className="text-xs text-slate-500">
                      Extracting merchant, date, and amounts
                    </p>
                  </div>
                  <div className="mt-1 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full w-2/3 animate-pulse rounded-full bg-teal-600/40" />
                  </div>
                </div>
              )}
            </section>

            <section aria-label="How it works" className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                How it works
              </h2>
              <ol className="grid grid-cols-3 gap-2">
                {HOW_IT_WORKS.map((item) => (
                  <li
                    key={item.step}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-center shadow-sm"
                  >
                    <span className="step-badge mx-auto">{item.step}</span>
                    <p className="mt-2 text-xs font-semibold text-slate-900">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                      {item.description}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}

        {step === "review" && parsed && (
          <ReceiptForm
            initial={parsed}
            imageBase64={imageBase64}
            onSubmit={handleSubmit}
            onRetakePhoto={handleRetakePhoto}
            loading={submitting}
          />
        )}

        {step === "done" && (
          <section className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-center">
              <div
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 ring-1 ring-teal-200"
                aria-hidden
              >
                <CheckIcon />
              </div>
              <h2 className="mt-4 text-xl font-semibold text-slate-900">
                Expense recorded
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {successMessage}. Open the{" "}
                <span className="font-medium text-slate-800">{savedTabName}</span>{" "}
                tab in your spreadsheet to view the new row.
              </p>
            </div>

            <div className="space-y-3">
              {sheetLink ? (
                <a
                  href={sheetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                >
                  <SheetIcon />
                  Open Google Sheet
                </a>
              ) : (
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-600">
                  Your receipt was saved. Check your configured Google Sheet for
                  the new entry.
                </p>
              )}
              <button
                type="button"
                onClick={resetFlow}
                className="btn-secondary"
              >
                Scan another receipt
              </button>
            </div>
          </section>
        )}
      </main>

      {step === "capture" && (
        <footer className="border-t border-slate-200 bg-white py-3 text-center text-xs text-slate-400">
          Add to home screen for quick capture
        </footer>
      )}
    </div>
  );
}

function StepIndicator({ current }: { current: "review" }) {
  const steps = [
    { id: "capture", label: "Capture" },
    { id: "review", label: "Review" },
    { id: "done", label: "Save" },
  ] as const;

  const currentIndex = steps.findIndex((s) => s.id === current);

  return (
    <nav aria-label="Progress" className="flex items-center gap-2">
      {steps.map((s, index) => {
        const isActive = index === currentIndex;
        const isComplete = index < currentIndex;

        return (
          <div key={s.id} className="flex flex-1 items-center gap-2">
            <div className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  isActive
                    ? "bg-teal-700 text-white"
                    : isComplete
                      ? "bg-teal-100 text-teal-800"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {isComplete ? "✓" : index + 1}
              </div>
              <span
                className={`text-[11px] font-medium ${
                  isActive ? "text-teal-800" : "text-slate-400"
                }`}
              >
                {s.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`mb-4 h-px flex-1 ${
                  isComplete ? "bg-teal-200" : "bg-slate-200"
                }`}
                aria-hidden
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className="h-7 w-7 text-teal-700"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function SheetIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="h-5 w-5"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="mt-0.5 h-5 w-5 shrink-0 text-rose-600"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}
