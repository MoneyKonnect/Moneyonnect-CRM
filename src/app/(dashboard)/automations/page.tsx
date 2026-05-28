import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { AutomationsClient } from "@/components/automations/automations-client";

export const metadata: Metadata = { title: "Automations" };

export default async function AutomationsPage() {
  const session = await auth();
  return (
    <div className="p-6 max-w-3xl space-y-6">
      <AutomationsClient />
    </div>
  );
}
