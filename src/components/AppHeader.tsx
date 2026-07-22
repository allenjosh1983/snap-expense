"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

type AppHeaderProps = {
  onHomeClick?: () => void;
};

export function AppHeader({ onHomeClick }: AppHeaderProps) {
  const { data: session } = useSession();
  const email = session?.user?.email;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3.5">
        {onHomeClick ? (
          <button
            type="button"
            onClick={onHomeClick}
            aria-label="Go to home"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-sm font-bold text-white transition hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          >
            SE
          </button>
        ) : (
          <Link
            href="/"
            aria-label="Go to home"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-sm font-bold text-white transition hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          >
            SE
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">Snap Expense</p>
          <p className="truncate text-xs text-slate-500">
            {email ?? "Expense tracking on the go"}
          </p>
        </div>
        <nav className="flex shrink-0 items-center gap-2">
          <Link
            href="/settings"
            className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Settings
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}
