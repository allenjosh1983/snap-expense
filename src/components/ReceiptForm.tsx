"use client";

import { useState } from "react";
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

export function ReceiptForm({
  initial,
  imageBase64,
  onSubmit,
  loading,
}: ReceiptFormProps) {
  const [merchant, setMerchant] = useState(initial.merchant);
  const [date, setDate] = useState(initial.date);
  const [total, setTotal] = useState(initial.total?.toFixed(2) ?? "");
  const [subtotal, setSubtotal] = useState(
    initial.subtotal?.toFixed(2) ?? "",
  );
  const [tax, setTax] = useState(initial.tax?.toFixed(2) ?? "");
  const [category, setCategory] = useState<ExpenseCategory>("Other");
  const [notes, setNotes] = useState("");
  const [deductible, setDeductible] = useState(true);

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
          <input
            value={date}
            onChange={(e) => setDate(e.target.value)}
            placeholder="MM/DD/YYYY"
            className="field-input"
            required
          />
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
