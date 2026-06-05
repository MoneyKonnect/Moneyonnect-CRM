"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Phone,
  Mail,
  MapPin,
  Edit2,
  MoreHorizontal,
  MessageSquare,
  Plus,
  Star,
  Globe,
  CheckCircle2,
  Circle,
  ExternalLink,
} from "lucide-react";
import { cn, getInitials, generateAvatarColor, formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ClientFormModal } from "@/components/clients/client-form-modal";
import { WhatsAppComposer } from "@/components/clients/whatsapp-composer";
import { updateOnboardingStep } from "@/actions/clients";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const STATUS_COLORS = {
  ACTIVE: "bg-success/10 text-success border-success/20",
  INACTIVE: "bg-muted text-muted-foreground border-border",
  PROSPECT: "bg-info/10 text-info border-info/20",
  DORMANT: "bg-warning/10 text-warning border-warning/20",
};

const CATEGORY_COLORS = {
  RETAIL: "text-muted-foreground", STANDARD: "text-blue-400",
  PREMIUM: "text-violet-400", HNI: "text-amber-400", ULTRA_HNI: "text-emerald-400",
};

const RISK_LABELS = {
  CONSERVATIVE: { label: "Conservative", color: "text-blue-400" },
  MODERATE: { label: "Moderate", color: "text-amber-400" },
  AGGRESSIVE: { label: "Aggressive", color: "text-orange-400" },
  VERY_AGGRESSIVE: { label: "Very Aggressive", color: "text-danger" },
};

export function ClientProfileHeader({ client }: { client: any }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);

  const statusColor = STATUS_COLORS[client.status as keyof typeof STATUS_COLORS];
  const categoryColor = CATEGORY_COLORS[client.category as keyof typeof CATEGORY_COLORS];
  const riskConfig = client.riskAppetite ? RISK_LABELS[client.riskAppetite as keyof typeof RISK_LABELS] : null;
  const isNRI = client.residency?.residencyType && client.residency.residencyType !== "RESIDENT_INDIAN";

  const onboardingCompleted = client.onboarding?.filter((s: any) => s.completed).length || 0;
  const onboardingTotal = client.onboarding?.length || 0;
  const onboardingPct = onboardingTotal > 0 ? Math.round((onboardingCompleted / onboardingTotal) * 100) : 0;

  const handleOnboardingToggle = async (stepId: string, completed: boolean) => {
    const result = await updateOnboardingStep(stepId, !completed);
    if (result.success) router.refresh();
    else toast.error("Failed to update");
  };

  const whatsappNumber = client.phone?.replace(/[^0-9]/g, "");

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 px-6 pt-4">
        <Link href="/clients" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" /> Clients
        </Link>
      </div>

      {/* Profile card */}
      <div className="mx-6 my-4 rounded-xl border border-border bg-card overflow-hidden">
        <div className={cn("h-1 w-full bg-gradient-to-r", generateAvatarColor(client.id))} />

        <div className="p-6">
          <div className="flex items-start gap-5 flex-wrap">
            {/* Avatar */}
            <div className={cn("w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-lg", generateAvatarColor(client.id))}>
              {getInitials(client.fullName)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-semibold text-foreground">{client.fullName}</h1>
                <span className={cn("text-2xs font-medium px-2 py-0.5 rounded-full border", statusColor)}>
                  {client.status}
                </span>
                {client.clientType === "HUF" && (
                  <span className="text-2xs font-medium px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">HUF</span>
                )}
                {isNRI && (
                  <span className="text-2xs font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                    <Globe className="h-2.5 w-2.5" />{client.residency.residencyType.replace(/_/g, " ")}
                  </span>
                )}
              </div>

              {/* Contact */}
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />{client.phone}
                  </a>
                )}
                {client.email && (
                  <a href={`mailto:${client.email}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />{client.email}
                  </a>
                )}
                {client.city && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />{client.city}{client.state ? `, ${client.state}` : ""}
                  </span>
                )}
              </div>

              {/* Tags */}
              {client.tags?.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {client.tags.map(({ tag }: any) => (
                    <span key={tag.id} className="text-2xs px-2 py-0.5 rounded-full border"
                      style={{ color: tag.color, borderColor: tag.color + "40", backgroundColor: tag.color + "15" }}>
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Onboarding progress bar */}
              {onboardingTotal > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-2xs text-muted-foreground">Onboarding: {onboardingCompleted}/{onboardingTotal}</span>
                    <button
                      onClick={() => setOnboardingOpen(!onboardingOpen)}
                      className="text-2xs text-brand-400 hover:text-brand-300 transition-colors"
                    >
                      {onboardingOpen ? "Hide" : "View steps"}
                    </button>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full transition-all"
                      style={{ width: `${onboardingPct}%` }}
                    />
                  </div>
                  {onboardingOpen && (
                    <div className="mt-2 space-y-1.5 bg-muted/30 rounded-lg p-3">
                      {client.onboarding?.map((step: any) => (
                        <button
                          key={step.id}
                          onClick={() => handleOnboardingToggle(step.id, step.completed)}
                          className="w-full flex items-center gap-2 text-left hover:bg-accent rounded px-2 py-1 transition-colors"
                        >
                          {step.completed
                            ? <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                            : <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          }
                          <span className={cn("text-xs", step.completed ? "text-muted-foreground line-through" : "text-foreground")}>
                            {step.stepName}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right stats */}
            <div className="flex items-start gap-6">
              {client.aum && (
                <div className="text-right">
                  <p className="text-2xs text-muted-foreground">AUM</p>
                  <p className="text-lg font-semibold text-foreground">{formatCurrency(Number(client.aum))}</p>
                </div>
              )}
              <div className="text-right">
                <p className="text-2xs text-muted-foreground">Category</p>
                <p className={cn("text-sm font-semibold", categoryColor)}>{client.category.replace("_", " ")}</p>
              </div>
              {riskConfig && (
                <div className="text-right hidden lg:block">
                  <p className="text-2xs text-muted-foreground">Risk</p>
                  <p className={cn("text-sm font-semibold", riskConfig.color)}>{riskConfig.label}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 ml-2">
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setEditOpen(true)}>
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </Button>

                {/* MessageSquare composer button */}
                {whatsappNumber && (
                  <Button size="sm" className="h-8 bg-emerald-500 hover:bg-emerald-600 text-white text-xs gap-1.5" onClick={() => setWhatsappOpen(true)}>
                    <MessageSquare className="h-3.5 w-3.5" /> MessageSquare
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setOnboardingOpen(!onboardingOpen)}>
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Onboarding Checklist
                    </DropdownMenuItem>
                    {client.email && (
                      <DropdownMenuItem asChild>
                        <a href={`mailto:${client.email}`}>
                          <Mail className="h-4 w-4 mr-2" /> Send Email
                        </a>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={`/clients/${client.id}/pdf`}>
                        <ExternalLink className="h-4 w-4 mr-2" /> Export PDF
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 mt-5 pt-5 border-t border-border">
            {[
              { label: "Interactions", value: client._count?.interactions || 0 },
              { label: "Tasks", value: client._count?.tasks || 0 },
              { label: "Investments", value: client.investments?.length || 0 },
              { label: "Goals", value: client.goals?.length || 0 },
              { label: "Client since", value: formatDate(client.createdAt, "short") },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-lg font-semibold text-foreground">{stat.value}</p>
                <p className="text-2xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ClientFormModal open={editOpen} onClose={() => setEditOpen(false)} client={client} />
      {whatsappNumber && (
        <WhatsAppComposer
          phone={client.phone || ""}
          clientName={client.fullName}
          open={whatsappOpen}
          onClose={() => setWhatsappOpen(false)}
        />
      )}
    </>
  );
}
