"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Phone,
  Mail,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  ExternalLink,
  Globe,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn, getInitials, generateAvatarColor, formatCurrency } from "@/lib/utils";
import { ClientFormModal } from "@/components/clients/client-form-modal";
import { deleteClient } from "@/actions/clients";
import { toast } from "sonner";

const STATUS_CONFIG = {
  ACTIVE: { label: "Active", class: "badge-success" },
  INACTIVE: { label: "Inactive", class: "badge-muted" },
  PROSPECT: { label: "Prospect", class: "badge-info" },
  DORMANT: { label: "Dormant", class: "badge-warning" },
};

const TYPE_CONFIG = {
  new:       { label: "New Client",  class: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" },
  converted: { label: "Converted",   class: "bg-brand-500/15 text-brand-400 border border-brand-500/30" },
  existing:  { label: "Existing",    class: "bg-amber-500/15 text-amber-400 border border-amber-500/30" },
};

const CATEGORY_CONFIG = {
  RETAIL: { label: "Retail", color: "text-muted-foreground" },
  STANDARD: { label: "Standard", color: "text-blue-400" },
  PREMIUM: { label: "Premium", color: "text-violet-400" },
  HNI: { label: "HNI", color: "text-amber-400" },
  ULTRA_HNI: { label: "Ultra HNI", color: "text-emerald-400" },
};

const RESIDENCY_CONFIG = {
  RESIDENT_INDIAN: { label: "Resident", flag: "🇮🇳" },
  NRI: { label: "NRI", flag: "🌏" },
  OCI: { label: "OCI", flag: "🌏" },
  PIO: { label: "PIO", flag: "🌏" },
  FOREIGN_NATIONAL: { label: "Foreign", flag: "🌍" },
  RETURNING_NRI: { label: "Returning NRI", flag: "🔄" },
};

interface ClientsTableProps {
  clients: any[];
  total: number;
  page: number;
  pageSize: number;
}

export function ClientsTable({ clients, total, page, pageSize }: ClientsTableProps) {
  const router = useRouter();
  const [editingClient, setEditingClient] = useState<any | null>(null);

  const totalPages = Math.ceil(total / pageSize);

  const handleDelete = async (clientId: string, name: string) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    const result = await deleteClient(clientId);
    if (result.success) {
      toast.success("Client deleted");
      router.refresh();
    } else {
      toast.error("Failed to delete client");
    }
  };

  if (clients.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-16 px-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
          <Phone className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground mb-1">No clients found</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Try adjusting your search or filters, or add your first client.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                  Client
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">
                  Contact
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">
                  Category
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden xl:table-cell">
                  AUM
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden xl:table-cell">
                  Residency
                </th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {clients.map((client) => {
                const statusCfg = STATUS_CONFIG[client.status as keyof typeof STATUS_CONFIG];
                const categoryCfg = CATEGORY_CONFIG[client.category as keyof typeof CATEGORY_CONFIG];
                const residency = client.residency?.residencyType
                  ? RESIDENCY_CONFIG[client.residency.residencyType as keyof typeof RESIDENCY_CONFIG]
                  : null;
                const typeCfg = client.clientType ? TYPE_CONFIG[client.clientType as keyof typeof TYPE_CONFIG] : null;

                return (
                  <tr
                    key={client.id}
                    className="hover:bg-accent/30 transition-colors group"
                  >
                    {/* Client info */}
                    <td className="px-4 py-3">
                      <Link
                        href={`/clients/${client.id}`}
                        className="flex items-center gap-3"
                      >
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-semibold flex-shrink-0",
                            generateAvatarColor(client.id)
                          )}
                        >
                          {getInitials(client.fullName)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-medium text-foreground truncate group-hover:text-brand-400 transition-colors">
                              {client.fullName}
                            </p>
                            {typeCfg && (
                              <span className={cn("text-2xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0", typeCfg.class)}>
                                {typeCfg.label}
                              </span>
                            )}
                          </div>
                          {client.city && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" />
                              {client.city}
                            </p>
                          )}
                        </div>
                      </Link>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="space-y-0.5">
                        {client.phone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Phone className="h-3 w-3" />
                            {client.phone}
                          </p>
                        )}
                        {client.email && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate max-w-[180px]">
                            <Mail className="h-3 w-3" />
                            {client.email}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          categoryCfg?.color
                        )}
                      >
                        {categoryCfg?.label || client.category}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span
                        className={cn(
                          "text-2xs font-medium px-2 py-0.5 rounded-full border",
                          statusCfg?.class
                        )}
                      >
                        {statusCfg?.label || client.status}
                      </span>
                    </td>

                    {/* AUM */}
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className="text-xs font-medium text-foreground">
                        {client.aum ? formatCurrency(Number(client.aum)) : "—"}
                      </span>
                    </td>

                    {/* Residency */}
                    <td className="px-4 py-3 hidden xl:table-cell">
                      {residency ? (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <span>{residency.flag}</span>
                          {residency.label}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem asChild>
                            <Link href={`/clients/${client.id}`} className="cursor-pointer">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View profile
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setEditingClient(client)}
                            className="cursor-pointer"
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-danger focus:text-danger cursor-pointer"
                            onClick={() => handleDelete(client.id, client.fullName)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {(page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={page === 1}
                asChild
              >
                <Link href={`?page=${page - 1}`}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <span className="text-xs text-muted-foreground px-2">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={page === totalPages}
                asChild
              >
                <Link href={`?page=${page + 1}`}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingClient && (
        <ClientFormModal
          open={!!editingClient}
          onClose={() => setEditingClient(null)}
          client={editingClient}
        />
      )}
    </>
  );
}
