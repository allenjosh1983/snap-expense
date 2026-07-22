import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasSheetConfigured } from "@/lib/db";
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

  return <HomePageClient />;
}
