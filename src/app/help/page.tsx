import Link from "next/link";
import { auth } from "@/auth";

const GETTING_STARTED = [
  {
    id: "sign-in",
    title: "Sign in with Google",
    body: "Use the same Google account you use for Gmail or Google Sheets. We only access spreadsheets you connect.",
  },
  {
    id: "connect-sheet",
    title: "Connect your spreadsheet",
    body: "After sign-in, open Settings and paste your Google Sheet URL. Receipts save to the tab you choose (default: Receipts).",
  },
  {
    id: "snap",
    title: "Snap a receipt",
    body: "Tap Capture receipt photo or Snap on the home screen. Allow camera access when prompted, then review and save.",
  },
  {
    id: "home-screen",
    title: "Add to Home Screen (optional)",
    body: "In Safari, tap Share → Add to Home Screen for quick access like an app.",
  },
] as const;

const FAQ = [
  {
    id: "why-google",
    question: "Why do I need to sign in with Google?",
    answer:
      "Snap Expense saves receipts to your Google Sheet using your account. Sign-in keeps your expenses in spreadsheets you own — not a shared account.",
  },
  {
    id: "where-receipts",
    question: "Where do my receipts go?",
    answer:
      "Each row is added to the Google Sheet you connected in Settings, on the tab you configured (usually Receipts). Open your sheet anytime from the home screen.",
  },
  {
    id: "privacy",
    question: "Can other people see my expenses?",
    answer:
      "Only people you share your Google Sheet with can view it. Other Snap Expense users have their own sheets — your data stays tied to your Google account.",
  },
  {
    id: "camera",
    question: "The camera won't open on my phone",
    answer:
      "Use Safari on iPhone or Chrome on Android. The site must be opened with https:// (not http). Allow camera permission when the browser asks.",
  },
  {
    id: "access-blocked",
    question: 'Google says "Access blocked" when I sign in',
    answer:
      "The app may still be in testing mode. Ask the person who invited you to add your Gmail address as a test user in Google Cloud, then try again in a new browser tab.",
  },
  {
    id: "existing-sheet",
    question: "Can I use a sheet I already have?",
    answer:
      "Yes. Paste any Google Sheet URL you own into Settings. Make sure you're signed in with the Google account that owns that sheet.",
  },
] as const;

function CaretIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="help-caret"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default async function HelpPage() {
  const session = await auth();
  const isLoggedIn = Boolean(session?.user?.email);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
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

      <header className="relative border-b border-slate-200/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3.5">
          <Link
            href={isLoggedIn ? "/" : "/login"}
            aria-label={isLoggedIn ? "Go to home" : "Go to sign in"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-sm font-bold text-white transition hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          >
            SE
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">Help</p>
            <p className="text-xs text-slate-500">Expense tracking on the go</p>
          </div>
          <Link
            href={isLoggedIn ? "/" : "/login"}
            className="rounded-md px-2 py-1 text-xs font-medium text-teal-800 transition hover:bg-teal-50"
          >
            {isLoggedIn ? "Back to app" : "Sign in"}
          </Link>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-lg flex-1 px-4 py-5 pb-10">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Help &amp; FAQ
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Tap a topic to expand instructions.
        </p>

        <section aria-labelledby="getting-started" className="mt-6 space-y-2">
          <h2
            id="getting-started"
            className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-500"
          >
            Getting started
          </h2>
          <div className="space-y-2">
            {GETTING_STARTED.map((item) => (
              <details key={item.id} className="help-disclosure group">
                <summary>
                  <span className="min-w-0 flex-1">{item.title}</span>
                  <CaretIcon />
                </summary>
                <div className="help-disclosure-body">{item.body}</div>
              </details>
            ))}
          </div>
        </section>

        <section aria-labelledby="faq" className="mt-8 space-y-2">
          <h2
            id="faq"
            className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-500"
          >
            FAQ
          </h2>
          <div className="space-y-2">
            {FAQ.map((item) => (
              <details key={item.id} className="help-disclosure group">
                <summary>
                  <span className="min-w-0 flex-1">{item.question}</span>
                  <CaretIcon />
                </summary>
                <div className="help-disclosure-body">{item.answer}</div>
              </details>
            ))}
          </div>
        </section>

        <p className="mt-8 text-center">
          <Link
            href={isLoggedIn ? "/" : "/login"}
            className="text-sm font-medium text-teal-800 underline-offset-2 hover:underline"
          >
            {isLoggedIn ? "Back to Snap Expense" : "Sign in to get started"}
          </Link>
        </p>
      </main>
    </div>
  );
}
