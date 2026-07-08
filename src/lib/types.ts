export const EXPENSE_CATEGORIES = [
  "Office Supplies",
  "Software & Subscriptions",
  "Travel",
  "Meals & Entertainment",
  "Equipment",
  "Professional Services",
  "Utilities",
  "Marketing",
  "Insurance",
  "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface ParsedReceipt {
  merchant: string;
  date: string;
  total: number | null;
  subtotal: number | null;
  tax: number | null;
  currency: string;
  rawText: string;
  confidence: "high" | "medium" | "low";
}

export interface ReceiptSubmission {
  merchant: string;
  date: string;
  total: number;
  subtotal?: number | null;
  tax?: number | null;
  category: ExpenseCategory;
  notes?: string;
  deductible: boolean;
  imageBase64?: string;
  rawText?: string;
}

export interface ReceiptRow extends ReceiptSubmission {
  id: string;
  submittedAt: string;
  imageUrl?: string;
}
