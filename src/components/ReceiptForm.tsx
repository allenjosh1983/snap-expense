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

export function ReceiptForm({
  initial,
  imageBase64,
  onSubmit,
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
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Review receipt</h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            initial.confidence === "high"
              ? "bg-emerald-100 text-emerald-700"
              : initial.confidence === "medium"
                ? "bg-amber-100 text-amber-700"
                : "bg-rose-100 text-rose-700"
          }`}
        >
          OCR {initial.confidence} confidence
        </span>
      </div>

      <p className="text-sm text-slate-600">
        Confirm the details before saving to your spreadsheet. Edit anything the
        scanner missed.
      </p>

      <Field label="Merchant">
        <input
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          className="field-input"
          required
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          {showDateHint && (
            <p className="text-xs text-amber-700">
              Check the date — OCR may have misread it
            </p>
          )}
          <div className="relative">
            <input
              value={date}
              onChange={handleDateDisplayChange}
              placeholder="MM/DD/YYYY"
              className="field-input pr-11"
              inputMode="numeric"
              required
            />
            <button
              type="button"
              onClick={openDatePicker}
              aria-label="Open calendar"
              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
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
        <Field label="Total">
          <input
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            inputMode="decimal"
            className="field-input"
            required
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Subtotal">
          <input
            value={subtotal}
            onChange={(e) => setSubtotal(e.target.value)}
            inputMode="decimal"
            className="field-input"
          />
        </Field>
        <Field label="Tax">
          <input
            value={tax}
            onChange={(e) => setTax(e.target.value)}
            inputMode="decimal"
            className="field-input"
          />
        </Field>
      </div>

      <Field label="Category">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
          className="field-input"
        >
          {EXPENSE_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="field-input"
          placeholder="Business purpose, client meeting, project, etc."
        />
      </Field>

      <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
        <input
          type="checkbox"
          checked={deductible}
          onChange={(e) => setDeductible(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        <span className="text-sm text-slate-700">
          Mark as tax-deductible business expense
        </span>
      </label>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl bg-slate-900 px-6 py-4 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Saving to spreadsheet..." : "Save to Google Sheets"}
      </button>
    </form>
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
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
