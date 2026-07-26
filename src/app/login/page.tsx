"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setLoading(true);
    setError(null);

    try {
      await signIn("google", { callbackUrl });
    } catch {
      setError("Sign-in failed. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10">
      {/* Subtle branded background */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-50 via-teal-50/40 to-slate-100"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgb(15 118 110 / 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgb(51 65 85 / 0.06) 0%, transparent 50%)",
        }}
        aria-hidden
      />

      <div className="relative w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-teal-700 text-sm font-bold text-white shadow-sm ring-4 ring-teal-700/10">
            SE
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            Snap Expense
          </h1>
          <p className="mt-1.5 text-sm font-medium text-teal-800">
            Expense tracking on the go
          </p>
        </div>

        {/* Sign-in card */}
        <div className="space-y-5 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur-sm">
          <div className="text-center">
            <p className="text-sm leading-relaxed text-slate-600">
              Sign in with Google to save receipts to your own spreadsheet.
            </p>
          </div>

          {error && (
            <div className="error-banner" role="alert">
              <p>{error}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleSignIn}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? (
              <>
                <span className="spinner-sm" aria-hidden />
                Signing in…
              </>
            ) : (
              <>
                <GoogleIcon />
                Sign in with Google
              </>
            )}
          </button>

          <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3">
            <p className="text-center text-xs leading-relaxed text-slate-600">
              <span className="font-medium text-slate-700">Permissions:</span>{" "}
              We request access to Google Sheets and Drive so receipts save to
              spreadsheets you own.
            </p>
          </div>
        </div>

        <p className="text-center">
          <Link
            href="/help"
            className="text-xs font-medium text-teal-800 underline-offset-2 hover:underline"
          >
            Help &amp; FAQ
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-teal-50/40 to-slate-100">
          <span className="spinner" aria-label="Loading" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function GoogleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      aria-hidden
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
