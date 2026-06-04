"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Megaphone, Plus, Send, Trash2, Clock, CheckCircle2,
  Mail, Users, Image, X, Loader2, Filter, Eye, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { deleteCampaign } from "@/actions/campaigns";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const CATEGORY_OPTIONS = [
  { value: "ALL", label: "All Clients", color: "text-foreground", count: null },
  { value: "ULTRA_HNI", label: "Ultra HNI (₹10Cr+)", color: "text-emerald-400" },
  { value: "HNI", label: "HNI (₹1Cr-₹10Cr)", color: "text-amber-400" },
  { value: "PREMIUM", label: "Premium (₹50L-₹1Cr)", color: "text-violet-400" },
  { value: "STANDARD", label: "Standard", color: "text-blue-400" },
];

const RESIDENCY_OPTIONS = [
  { value: "ALL", label: "All Residency" },
  { value: "NRI", label: "NRI Only" },
  { value: "RESIDENT_INDIAN", label: "Resident Indian Only" },
];

const AGE_OPTIONS = [
  { value: "ALL", label: "All Ages" },
  { value: "MINOR", label: "👶 Clients with Minor Children (under 18)" },
  { value: "SENIOR", label: "👴 Senior Clients (60+)" },
];

const QUICK_TEMPLATES = [
  { label: "Portfolio Review", subject: "Your Portfolio Review - {month}", body: "Dear {name},\n\nI hope this message finds you well.\n\nI would like to schedule your quarterly portfolio review to discuss your investments and financial goals.\n\nYour current portfolio has been performing well. I look forward to connecting with you soon.\n\nBest regards,\nAditya Anthwal\nMoneyKonnect by Tayal Capital" },
  { label: "Investment Opportunity", subject: "Exclusive Investment Opportunity for {category} Clients", body: "Dear {name},\n\nI am reaching out to share an exciting investment opportunity that aligns with your financial profile.\n\nPlease find the details attached. I would love to discuss this with you at your convenience.\n\nBest regards,\nAditya Anthwal\nMoneyKonnect by Tayal Capital" },
  { label: "Market Update", subject: "Market Update - Important Update for Your Portfolio", body: "Dear {name},\n\nI wanted to share some important market updates that may impact your investments.\n\nPlease review the attached information and feel free to reach out if you have any questions.\n\nBest regards,\nAditya Anthwal\nMoneyKonnect by Tayal Capital" },
  { label: "Festive Greetings", subject: "Warm Festive Greetings from MoneyKonnect", body: "Dear {name},\n\nWishing you and your family a joyous festive season filled with happiness and prosperity!\n\nThank you for your continued trust in MoneyKonnect.\n\nWarm regards,\nAditya Anthwal\nMoneyKonnect by Tayal Capital" },
  { label: "Children's Scheme", subject: "Secure Your Child's Future - Investment Plans for Kids", body: "Dear {name},\n\nAs a parent, securing your child's financial future is one of the most important gifts you can give.\n\nWe have curated some excellent investment schemes specifically designed for children's education and future goals:\n\n• Sukanya Samriddhi Yojana (for girl child)\n• Children's Mutual Fund Plans\n• Education Planning SIPs\n\nPlease find more details in the attached image. I would love to discuss which option suits your family best.\n\nBest regards,\nAditya Anthwal\nMoneyKonnect by Tayal Capital" },
];

const STATUS_CONFIG: Record<string, { label: string; icon: any; class: string }> = {
  DRAFT:     { label: "Draft",     icon: Clock,        class: "bg-muted text-muted-foreground" },
  SCHEDULED: { label: "Scheduled", icon: Clock,        class: "bg-amber-500/15 text-amber-400" },
  SENDING:   { label: "Sending",   icon: Loader2,      class: "bg-blue-500/15 text-blue-400" },
  SENT:      { label: "Sent",      icon: CheckCircle2, class: "bg-emerald-500/15 text-emerald-400" },
  FAILED:    { label: "Failed",    icon: AlertCircle,  class: "bg-danger/15 text-danger" },
};

export function CampaignsClient({ campaigns }: { campaigns: any[] }) {
  const router = useRouter();
  const [showCompose, setShowCompose] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Form state
  const [campaignName, setCampaignName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("ALL");
  const [residency, setResidency] = useState("ALL");
  const [ageFilter, setAgeFilter] = useState("ALL");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const applyTemplate = (t: typeof QUICK_TEMPLATES[0]) => {
    setSubject(t.subject);
    setBody(t.body);
    if (!campaignName) setCampaignName(t.label);
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) { toast.error("Subject and message are required"); return; }
    if (!confirm(`Send email campaign to ${category === "ALL" ? "all" : category} clients${residency !== "ALL" ? ` (${residency})` : ""}?`)) return;

    setSending(true);
    setResult(null);
    const formData = new FormData();
    formData.append("subject", subject);
    formData.append("body", body);
    formData.append("category", category);
    formData.append("residency", residency);
    formData.append("ageFilter", ageFilter);
    formData.append("campaignName", campaignName || subject);
    if (image) formData.append("image", image);

    try {
      const res = await fetch("/api/campaigns/send", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed"); return; }
      setResult(data);
      toast.success(data.message);
      router.refresh();
      // Reset form
      setCampaignName(""); setSubject(""); setBody(""); setImage(null); setImagePreview(null);
      setShowCompose(false);
    } catch { toast.error("Failed to send campaign"); }
    finally { setSending(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    const result = await deleteCampaign(id);
    if (result.success) { toast.success("Deleted"); router.refresh(); }
    else toast.error(result.error || "Failed");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center">
            <Megaphone className="h-5 w-5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Campaigns</h1>
            <p className="text-sm text-muted-foreground">{campaigns.length} total · {campaigns.filter(c => c.status === "SENT").length} sent</p>
          </div>
        </div>
        <button onClick={() => setShowCompose(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-all shadow-glow-sm">
          <Plus className="h-4 w-4" /> New Campaign
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Sent", value: campaigns.filter(c => c.status === "SENT").length, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "In Draft", value: campaigns.filter(c => c.status === "DRAFT").length, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Scheduled", value: campaigns.filter(c => c.status === "SCHEDULED").length, icon: Clock, color: "text-blue-400", bg: "bg-blue-500/10" },
        ].map((stat) => (
          <div key={stat.label} className="border border-border rounded-xl p-4 bg-card flex items-center gap-3">
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", stat.bg)}>
              <stat.icon className={cn("h-4 w-4", stat.color)} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Campaign list */}
      {campaigns.length === 0 ? (
        <div className="border border-border rounded-xl p-12 text-center bg-card">
          <Megaphone className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium">No campaigns yet</p>
          <p className="text-sm text-muted-foreground mt-1">Send bulk emails to your clients by category</p>
          <button onClick={() => setShowCompose(true)}
            className="mt-4 px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-all">
            Create first campaign
          </button>
        </div>
      ) : (
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <div className="divide-y divide-border">
            {campaigns.map((campaign) => {
              const statusCfg = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.DRAFT;
              const Icon = statusCfg.icon;
              return (
                <div key={campaign.id} className="flex items-center gap-4 px-4 py-3 hover:bg-accent/30 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-4 w-4 text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{campaign.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {campaign._count?.recipients || 0} recipients · {campaign.createdAt ? format(new Date(campaign.createdAt), "d MMM yyyy") : ""}
                    </p>
                  </div>
                  <span className={cn("flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium", statusCfg.class)}>
                    <Icon className="h-3 w-3" />
                    {statusCfg.label}
                  </span>
                  <button onClick={() => handleDelete(campaign.id, campaign.name)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/10 transition-all">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget && !sending) setShowCompose(false); }}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Mail className="h-4 w-4 text-brand-400" /> New Email Campaign
              </h2>
              <button onClick={() => !sending && setShowCompose(false)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Quick templates */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Quick Templates:</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_TEMPLATES.map((t) => (
                    <button key={t.label} onClick={() => applyTemplate(t)}
                      className="text-xs px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-all border border-brand-500/20">
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target audience */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-muted/30 rounded-xl border border-border">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Filter className="h-3 w-3" /> Target Category
                  </label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500 text-foreground">
                    {CATEGORY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Users className="h-3 w-3" /> Residency Filter
                  </label>
                  <select value={residency} onChange={(e) => setResidency(e.target.value)}
                    className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500 text-foreground">
                    {RESIDENCY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Users className="h-3 w-3" /> Age Group
                  </label>
                  <select value={ageFilter} onChange={(e) => setAgeFilter(e.target.value)}
                    className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500 text-foreground">
                    {AGE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">
                    💡 Variables you can use: <code className="bg-muted px-1 rounded">{"{name}"}</code> <code className="bg-muted px-1 rounded">{"{fullname}"}</code> <code className="bg-muted px-1 rounded">{"{aum}"}</code> <code className="bg-muted px-1 rounded">{"{city}"}</code>
                  </p>
                </div>
              </div>

              {/* Campaign name */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Campaign Name</label>
                <input value={campaignName} onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. Q2 Portfolio Review"
                  className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500 text-foreground" />
              </div>

              {/* Subject */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email Subject *</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)}
                  placeholder="Your Portfolio Review is Due"
                  className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500 text-foreground" />
              </div>

              {/* Body */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Message *</label>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8}
                  placeholder="Dear {name},&#10;&#10;Your message here..."
                  className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500 text-foreground resize-none" />
              </div>

              {/* Image upload */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Image className="h-3 w-3" /> Attach Image (optional)
                </label>
                {imagePreview ? (
                  <div className="relative inline-block">
                    <img src={imagePreview} alt="Preview" className="h-32 rounded-lg object-cover border border-border" />
                    <button onClick={() => { setImage(null); setImagePreview(null); }}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-danger rounded-full flex items-center justify-center text-white">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-brand-500/50 hover:bg-accent/20 transition-all">
                    <Image className="h-6 w-6 text-muted-foreground mx-auto mb-1.5" />
                    <p className="text-sm text-muted-foreground">Click to upload scheme image</p>
                    <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG up to 5MB</p>
                    <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={handleImage} />
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 flex items-center justify-between border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">
                Sends from: <span className="text-foreground">info@moneykonnect.in</span>
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => !sending && setShowCompose(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-accent transition-all">
                  Cancel
                </button>
                <button onClick={handleSend} disabled={sending || !subject.trim() || !body.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition-all font-medium">
                  {sending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending...</> : <><Send className="h-3.5 w-3.5" /> Send Campaign</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
