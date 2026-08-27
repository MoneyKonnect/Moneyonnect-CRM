import { Metadata } from "next";
import { ComplianceClient } from "@/components/compliance/compliance-client";

export const metadata: Metadata = { title: "Compliance Register" };

export default function CompliancePage() {
  return (
    <div className="p-6 max-w-[1400px]">
      <ComplianceClient />
    </div>
  );
}
