import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserSheetConfig } from "@/lib/db";
import HomePageClient from "./HomePageClient";

export default async function HomePage() {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    redirect("/login");
  }

  const sheetConfig = getUserSheetConfig(email);
  const configuredSpreadsheet = sheetConfig
    ? {
        url: `https://docs.google.com/spreadsheets/d/${sheetConfig.spreadsheetId}/edit`,
        tabName: sheetConfig.tabName,
      }
    : null;

  return <HomePageClient configuredSpreadsheet={configuredSpreadsheet} />;
}
