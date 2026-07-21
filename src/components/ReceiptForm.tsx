"use client";

import { useEffect, useRef, useState } from "react";
import {
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
  type ParsedReceipt,
  type ReceiptSubmission,
} from "@/lib/types";

interface ReceiptFormProps {
  initial: ParsedReceipt;
  imageBase64: string;
  onSubmit: (receipt: ReceiptSubmission) => Promise<void>;
  onRetakePhoto: () => void;
  loading?: boolean;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function isoToDisplay(iso: string): string {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return "";
  return `${month}/${day}/${year}`;
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function displayToIso(display: string): string | null {
  const match = display.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const month = Number.parseInt(match[1], 10);
  const day = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);
  if (!isValidDateParts(year, month, day)) return null;

  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function parseOcrDateToIso(ocrDate: string): string | null {
  const trimmed = ocrDate.trim();
  if (!trimmed) return null;

  const monthFirst = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (monthFirst) {
    let year = Number.parseInt(monthFirst[3], 10);
    if (monthFirst[3].length === 2) {
      year = year >= 70 ? 1900 + year : 2000 + year;
    }
    const month = Number.parseInt(monthFirst[1], 10);
    const day = Number.parseInt(monthFirst[2], 10);
    if (!isValidDateParts(year, month, day)) return null;
    return `${year}-${pad2(month)}-${pad2(day)}`;
  }

  const yearFirst = trimmed.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (yearFirst) {
    const year = Number.parseInt(yearFirst[1], 10);
    const month = Number.parseInt(yearFirst[2], 10);
    const day = Number.parseInt(yearFirst[3], 10);
    if (!isValidDateParts(year, month, day)) return null;
    return `${year}-${pad2(month)}-${pad2(day)}`;
  }

  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    const date = new Date(parsed);
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }

  return null;
}

function needsDateReview(initial: ParsedReceipt): boolean {
  if (initial.confidence !== "high") return true;
  if (!initial.date.trim()) return true;
  return parseOcrDateToIso(initial.date) === null;
}

function confidenceClass(confidence: ParsedReceipt["confidence"]): string {
  if (confidence === "high") return "confidence-badge confidence-high";
  if (confidence === "medium") return "confidence-badge confidence-medium";
  return "confidence-badge confidence-low";
}

export function ReceiptForm({
  initial,
  imageBase64,
  onSubmit,
  onRetakePhoto,
  loading,
}: ReceiptFormProps) {
  const initialIso = parseOcrDateToIso(initial.date);
  const showDateHint = needsDateReview(initial);
  const datePickerRef = useRef<HTMLInputElement>(null);

  const [merchant, setMerchant] = useState(initial.merchant);
  const [date, setDate] = useState(
    initialIso ? isoToDisplay(initialIso) : initial.date,
  );
  const [dateIso, setDateIso] = useState(initialIso ?? "");
  const [total, setTotal] = useState(initial.total?.toFixed(2) ?? "");
  const [subtotal, setSubtotal] = useState(
    initial.subtotal?.toFixed(2) ?? "",
  );
  const [tax, setTax] = useState(initial.tax?.toFixed(2) ?? "");
  const [category, setCategory] = useState<ExpenseCategory>("Other");
  const [notes, setNotes] = useState("");
  const [deductible, setDeductible] = useState(true);

  useEffect(() => {
    if (!showDateHint) return;

    const timer = window.setTimeout(() => {
      const picker = datePickerRef.current;
      if (!picker) return;

      try {
        picker.showPicker?.();
      } catch {
        // showPicker may require a user gesture on some browsers
      }
      picker.focus();
    }, 350);

    return () => window.clearTimeout(timer);
  }, [showDateHint]);

  function openDatePicker() {
    const picker = datePickerRef.current;
    if (!picker) return;

    try {
      picker.showPicker?.();
    } catch {
      // fall through to focus
    }
    picker.focus();
  }

  function handleDateDisplayChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setDate(value);

    const iso = displayToIso(value);
    if (iso) setDateIso(iso);
  }

  function handleDatePickerChange(event: React.ChangeEvent<HTMLInputElement>) {
    const iso = event.target.value;
    setDateIso(iso);
    if (iso) setDate(isoToDisplay(iso));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit({
      merchant: merchant.trim(),
      date: date.trim(),
      total: Number.parseFloat(total),
      subtotal: subtotal ? Number.parseFloat(subtotal) : null,
      tax: tax ? Number.parseFloat(tax) : null,
      category,
      notes: notes.trim(),
      deductible,
      imageBase64,
      rawText: initial.rawText,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="pb-24">
      <div className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Review receipt
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Confirm details before saving to your expense sheet.
            </p>
          </div>
          <span className={confidenceClass(initial.confidence)}>
            OCR {initial.confidence}
          </span>
        </div>

        {imageBase64 && (
          <section className="space-y-3" aria-label="Receipt photo">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/jpeg;base64,${imageBase64}`}
                alt="Captured receipt"
                className="max-h-48 w-full object-contain"
              />
            </div>
            <button
              type="button"
              onClick={onRetakePhoto}
              disabled={loading}
              className="btn-secondary min-h-11"
            >
              <RetakeIcon />
              Retake photo
            </button>
          </section>
        )}

        <section className="form-section">
          <h3 className="form-section-title">Receipt details</h3>

          <Field label="Merchant / vendor">
            <input
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="field-input"
              placeholder="Store or business name"
              required
            />
          </Field>

          <Field label="Transaction date">
            {showDateHint && (
              <p className="text-xs font-medium text-amber-700">
                Verify the date — OCR may have misread it
              </p>
            )}
            <div className="relative">
              <input
                value={date}
                onChange={handleDateDisplayChange}
                placeholder="MM/DD/YYYY"
                className="field-input pr-12"
                inputMode="numeric"
                required
              />
              <button
                type="button"
                onClick={openDatePicker}
                aria-label="Open calendar"
                className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-teal-700"
              >
                <CalendarIcon />
              </button>
              <input
                ref={datePickerRef}
                type="date"
                value={dateIso}
                onChange={handleDatePickerChange}
                tabIndex={-1}
                aria-hidden
                className="pointer-events-none absolute h-0 w-0 opacity-0"
              />
            </div>
          </Field>
        </section>

        <section className="form-section">
          <h3 className="form-section-title">Tax &amp; amounts</h3>

          <Field label="Total amount">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                $
              </span>
              <input
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                inputMode="decimal"
                className="field-input pl-7"
                placeholder="0.00"
                required
              />
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Subtotal">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  $
                </span>
                <input
                  value={subtotal}
                  onChange={(e) => setSubtotal(e.target.value)}
                  inputMode="decimal"
                  className="field-input pl-7"
                  placeholder="0.00"
                />
              </div>
            </Field>
            <Field label="Sales tax">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  $
                </span>
                <input
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  inputMode="decimal"
                  className="field-input pl-7"
                  placeholder="0.00"
                />
              </div>
            </Field>
          </div>
        </section>

        <section className="form-section">
          <h3 className="form-section-title">Classification</h3>

          <Field label="Expense category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="field-select"
            >
              {EXPENSE_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Notes (optional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="field-input min-h-[4.5rem] resize-none"
              placeholder="Business purpose, client meeting, project code…"
            />
          </Field>

          <div
            className={`rounded-lg border p-4 transition ${
              deductible
                ? "border-teal-200 bg-teal-50/60"
                : "border-slate-200 bg-white"
            }`}
          >
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={deductible}
                onChange={(e) => setDeductible(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
              />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium text-slate-900">
                  Tax-deductible business expense
                </span>
                <span className="block text-xs leading-relaxed text-slate-600">
                  Check for ordinary LLC operating expenses you can write off.
                  Uncheck for personal or non-deductible purchases.
                </span>
              </span>
            </label>
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm safe-bottom">
        <div className="mx-auto max-w-lg">
          <button type="submit" disabled={loading} className="btn-accent">
            {loading ? (
              <>
                <span className="spinner-sm" aria-hidden />
                Saving to spreadsheet…
              </>
            ) : (
              "Save to Google Sheets"
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

function RetakeIcon() {
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
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z"
      />
    </svg>
  );
}

function CalendarIcon() {
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
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
