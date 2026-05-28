"use client";

import { usePathname } from "next/navigation";

interface Breadcrumb {
  label: string;
  href: string;
}

const routeLabels: Record<string, string> = {
  dashboard:     "Dashboard",
  clients:       "Clients",
  leads:         "Pipeline",
  tasks:         "Tasks",
  campaigns:     "Campaigns",
  documents:     "Document Vault",
  analytics:     "Analytics",
  settings:      "Settings",
  "ai-insights": "AI Insights",
  "operations": "Operations Board",
  "webinars": "Webinars",
  notifications: "Notifications",
  organization:  "Organization",
  automations:   "Automations",
  birthdays:     "Birthday Calendar",
  aum:           "AUM Dashboard",
  new:           "New",
  edit:          "Edit",
  family:        "Family",
  residency:     "Residency",
  financials:    "Financials",
  timeline:      "Timeline",
  notes:         "Notes",
  communication: "Communication",
};

export function useBreadcrumbs(): Breadcrumb[] {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: Breadcrumb[] = [];
  let currentPath = "";

  for (const segment of segments) {
    currentPath += `/${segment}`;
    // Skip IDs (cuid = 25 chars, uuid-like) but not short named routes
    const isId = segment.length > 20 && !routeLabels[segment] && /^[a-z0-9]+$/.test(segment);
    if (isId) {
      if (breadcrumbs.length > 0) {
        breadcrumbs[breadcrumbs.length - 1] = {
          ...breadcrumbs[breadcrumbs.length - 1],
          label: "Profile",
        };
      }
      continue;
    }
    breadcrumbs.push({
      label: routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
      href: currentPath,
    });
  }

  return breadcrumbs;
}
