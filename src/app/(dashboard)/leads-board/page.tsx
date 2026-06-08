import { Metadata } from "next";
import LeadsBoardClient from "./leads-board-client";

export const metadata: Metadata = { title: "Leads Board" };

export default function LeadsBoardPage() {
  return <div className="h-full flex flex-col"><LeadsBoardClient /></div>;
}
