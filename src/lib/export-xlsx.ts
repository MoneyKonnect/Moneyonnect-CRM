import * as XLSX from "xlsx";

export interface LeadExportRow {
  Name: string;
  Phone: string;
  Email: string;
  Source: string;
  Interest: string;
  ResidencyType: string;
  Stage: string;
  EstimatedValue: string;
  ConvertedDate: string;
  AssignedTo: string;
  CreatedAt: string;
}

export function exportLeadsToXlsx(leads: any[], filename = "leads.xlsx") {
  const rows: LeadExportRow[] = leads.map(l => ({
    Name: l.fullName || "",
    Phone: l.phone || "",
    Email: l.email || "",
    Source: l.source?.replace(/_/g, " ") || "",
    Interest: l.interest || "",
    ResidencyType: l.residencyType || "RESIDENT",
    Stage: l.stage?.replace(/_/g, " ") || "",
    EstimatedValue: l.estimatedValue ? `₹${Number(l.estimatedValue).toLocaleString("en-IN")}` : "",
    ConvertedDate: l.convertedAt ? new Date(l.convertedAt).toLocaleDateString("en-IN") : "",
    AssignedTo: l.owner?.name || "",
    CreatedAt: l.createdAt ? new Date(l.createdAt).toLocaleDateString("en-IN") : "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  // Style header row
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  ws["!cols"] = [
    { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 15 },
    { wch: 40 }, { wch: 15 }, { wch: 20 }, { wch: 18 },
    { wch: 15 }, { wch: 20 }, { wch: 15 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Leads");
  XLSX.writeFile(wb, filename);
}

export function exportSingleLead(lead: any) {
  exportLeadsToXlsx([lead], `lead-${lead.fullName?.replace(/\s+/g, "-")}-${Date.now()}.xlsx`);
}

export function exportConvertedLeads(leads: any[]) {
  const converted = leads.filter(l => l.stage === "CONVERTED");
  exportLeadsToXlsx(converted, `converted-leads-${new Date().toISOString().split("T")[0]}.xlsx`);
}
