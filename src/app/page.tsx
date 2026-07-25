import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserByEmail, hasSheetConfigured } from "@/lib/db";
import HomePageClient from "./HomePageClient";

export default async function HomePage() {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    redirect("/login");
  }

  if (!hasSheetConfigured(email)) {
    redirect("/settings");
  }

  const user = getUserByEmail(email);
  const configuredSpreadsheet =
    user?.spreadsheetId != null
      ? {
          url: `https://docs.google.com/spreadsheets/d/${user.spreadsheetId}/edit`,
          tabName: user.tabName || "Receipts",
        }
      : null;

  return <HomePageClient configuredSpreadsheet={configuredSpreadsheet} />;
}
