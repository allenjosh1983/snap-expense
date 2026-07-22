"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";

type SettingsResponse = {
  spreadsheetUrl: string | null;
  tabName: string;
  driveFolderId: string | null;
  configured: boolean;
};

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState("");
  const [tabName, setTabName] = useState("Receipts");
  const [driveFolderId, setDriveFolderId] = useState("");
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch("/api/settings");
        const data = (await response.json()) as SettingsResponse & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error || "Failed to load settings");
        }

        setSpreadsheetUrl(data.spreadsheetUrl ?? "");
        setTabName(data.tabName || "Receipts");
        setDriveFolderId(data.driveFolderId ?? "");
        setIsConfigured(Boolean(data.configured));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load settings");
      } finally {
        setLoading(false);
      }
    }

    void loadSettings();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadsheetUrl,
          tabName,
          driveFolderId: driveFolderId.trim() || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save settings");
      }

      setSpreadsheetUrl(data.spreadsheetUrl ?? spreadsheetUrl);
      setTabName(data.tabName || tabName);
      setDriveFolderId(data.driveFolderId ?? "");
      setIsConfigured(true);
      setSuccess("Settings saved. You can start scanning receipts.");

      if (!isConfigured) {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 pb-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isConfigured ? "Settings" : "Connect your spreadsheet"}
          </h1>
          <p className="text-sm leading-relaxed text-slate-600">
            {isConfigured
              ? "Update the Google Sheet where your receipts are saved."
              : "Paste your Google Sheet URL so Snap Expense knows where to save receipts."}
          </p>
        </div>

        {loading ? (
          <div className="loading-panel">
            <span className="spinner" aria-hidden />
            <p className="text-sm text-slate-600">Loading settings…</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
          >
            {error && (
              <div className="error-banner" role="alert">
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
                {success}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="spreadsheetUrl" className="text-sm font-medium text-slate-700">
                Google Sheet URL or ID
              </label>
              <input
                id="spreadsheetUrl"
                name="spreadsheetUrl"
                type="text"
                required
                value={spreadsheetUrl}
                onChange={(event) => setSpreadsheetUrl(event.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/…/edit"
                className="field-input"
              />
              <p className="text-xs text-slate-500">
                Use a spreadsheet in the Google account you signed in with.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="tabName" className="text-sm font-medium text-slate-700">
                Tab name
              </label>
              <input
                id="tabName"
                name="tabName"
                type="text"
                value={tabName}
                onChange={(event) => setTabName(event.target.value)}
                className="field-input"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="driveFolderId" className="text-sm font-medium text-slate-700">
                Drive folder for receipt images (optional)
              </label>
              <input
                id="driveFolderId"
                name="driveFolderId"
                type="text"
                value={driveFolderId}
                onChange={(event) => setDriveFolderId(event.target.value)}
                placeholder="Folder URL or ID"
                className="field-input"
              />
              <p className="text-xs text-slate-500">
                Leave blank to skip image uploads. Use a folder you own in My Drive.
              </p>
            </div>

            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? (
                <>
                  <span className="spinner-sm" aria-hidden />
                  Saving…
                </>
              ) : (
                "Save settings"
              )}
            </button>

            {isConfigured && (
              <Link href="/" className="btn-secondary">
                Back to scanning
              </Link>
            )}
          </form>
        )}
      </main>
    </div>
  );
}
