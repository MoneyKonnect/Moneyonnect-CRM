"use client";
import { FoliosSection } from "@/components/clients/profile/folios-section";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Calendar,
  Check,
  Edit2,
  IndianRupee,
  Loader2,
  Plus,
  Shield,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RiskProfileQuiz } from "@/components/intelligence/risk-profile-quiz";
import { createInvestment, updateInvestment, deleteInvestment, createGoal, updateGoal, deleteGoal } from "@/actions/investments";
import { ReferralSection } from "@/components/clients/profile/tabs/referral-section";

const INVESTMENT_TYPES = [
  "MUTUAL_FUND","STOCKS","BONDS","FD","NPS","PPF","REAL_ESTATE",
  "INSURANCE","PMS","AIF","ULIP","ELSS","SCSS","OTHER",
];

const GOAL_TYPES = [
  { value: "EDUCATION", label: "🎓 Education", color: "text-blue-400", bar: "bg-blue-500" },
  { value: "RETIREMENT", label: "🌅 Retirement", color: "text-violet-400", bar: "bg-violet-500" },
  { value: "HOME", label: "🏠 Home", color: "text-amber-400", bar: "bg-amber-500" },
  { value: "EMERGENCY", label: "🚨 Emergency Fund", color: "text-rose-400", bar: "bg-rose-500" },
  { value: "MARRIAGE", label: "💍 Marriage", color: "text-pink-400", bar: "bg-pink-500" },
  { value: "BUSINESS", label: "💼 Business", color: "text-cyan-400", bar: "bg-cyan-500" },
  { value: "TRAVEL", label: "✈️ Travel", color: "text-emerald-400", bar: "bg-emerald-500" },
  { value: "OTHER", label: "📦 Other", color: "text-muted-foreground", bar: "bg-muted-foreground" },
];

const RISK_CONFIG: Record<string, any> = {
  CONSERVATIVE: { emoji: "🛡️", label: "Conservative", color: "text-blue-400", bg: "bg-blue-500/10" },
  MODERATE: { emoji: "⚖️", label: "Moderate", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  AGGRESSIVE: { emoji: "🚀", label: "Aggressive", color: "text-amber-400", bg: "bg-amber-500/10" },
  VERY_AGGRESSIVE: { emoji: "⚡", label: "Very Aggressive", color: "text-orange-400", bg: "bg-orange-500/10" },
};

export function OverviewTab({ client }: { client: any }) {
  const [showRiskQuiz, setShowRiskQuiz] = useState(false);
  const [addInvOpen, setAddInvOpen] = useState(false);
  const [addGoalOpen, setAddGoalOpen] = useState(false);
  const [editingInv, setEditingInv] = useState<any>(null);

  const totalInvested = client.investments?.reduce((s: number, i: any) => s + Number(i.amount), 0) || 0;
  const totalCurrent = client.investments?.reduce((s: number, i: any) => s + Number(i.currentValue || i.amount), 0) || 0;
  const totalReturn = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested * 100) : 0;
  const riskCfg = client.riskAppetite ? RISK_CONFIG[client.riskAppetite] : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ── Left column ── */}
      <div className="lg:col-span-1 space-y-4">

        {/* Personal details */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" /> Personal Details
          </h3>
          <dl className="space-y-3">
            {[
              { label: "Date of Birth", value: client.dob ? formatDate(client.dob, "medium") : null },
              { label: "PAN", value: client.pan },
              { label: "Occupation", value: client.occupation },
              { label: "Income", value: client.incomeBracket },
              { label: "Pincode", value: client.pincode },
              { label: "City / State", value: client.city ? `${client.city}${client.state ? ", " + client.state : ""}` : null },
            ].filter(i => i.value).map(item => (
              <div key={item.label} className="flex justify-between gap-4">
                <dt className="text-xs text-muted-foreground flex-shrink-0">{item.label}</dt>
                <dd className="text-xs font-medium text-foreground text-right">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Risk Profile */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" /> Risk Profile
            </h3>
            <Button size="sm" variant="ghost" className="h-6 text-2xs text-brand-400 hover:text-brand-300"
              onClick={() => setShowRiskQuiz(!showRiskQuiz)}>
              {showRiskQuiz ? "Hide" : client.riskProfile ? "Retake" : "Take quiz"}
            </Button>
          </div>
          {showRiskQuiz ? (
            <RiskProfileQuiz clientId={client.id} clientName={client.fullName}
              existingProfile={client.riskProfile} onComplete={() => setShowRiskQuiz(false)} />
          ) : riskCfg ? (
            <div className={cn("flex items-center gap-3 rounded-lg p-3", riskCfg.bg)}>
              <span className="text-2xl">{riskCfg.emoji}</span>
              <div>
                <p className={cn("text-sm font-bold", riskCfg.color)}>{riskCfg.label}</p>
                {client.riskProfile?.score && (
                  <p className="text-2xs text-muted-foreground">Score: {client.riskProfile.score}/45</p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-3 text-center">
              <p className="text-xs text-muted-foreground">No risk profile yet</p>
              <button onClick={() => setShowRiskQuiz(true)}
                className="text-2xs text-brand-400 hover:text-brand-300 mt-1 transition-colors">
                Take assessment →
              </button>
            </div>
          )}
        </div>

        {/* Financial Goals */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" /> Financial Goals
            </h3>
            <Button size="sm" variant="ghost" className="h-6 text-2xs text-brand-400 hover:text-brand-300"
              onClick={() => setAddGoalOpen(true)}>
              <Plus className="h-3 w-3 mr-0.5" /> Add
            </Button>
          </div>
          {client.goals?.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-xs text-muted-foreground">No goals yet</p>
              <button onClick={() => setAddGoalOpen(true)} className="text-2xs text-brand-400 mt-1">Add first goal →</button>
            </div>
          ) : (
            <div className="space-y-3">
              {client.goals?.map((goal: any) => {
                const cfg = GOAL_TYPES.find(g => g.value === goal.goalType) || GOAL_TYPES[7];
                const progress = Math.min(100, Math.round((Number(goal.currentAmount) / Number(goal.targetAmount)) * 100));
                return <GoalRow key={goal.id} goal={goal} cfg={cfg} progress={progress} />;
              })}
            </div>
          )}
        </div>
      {/* Referral */}
        <ReferralSection client={client} />
      </div>

      {/* ── Right column ── */}
      <div className="lg:col-span-2 space-y-4">

        {/* Investment summary cards */}
        {client.investments?.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total Invested", value: formatCurrency(totalInvested), color: "text-foreground" },
              { label: "Current Value", value: formatCurrency(totalCurrent), color: totalCurrent >= totalInvested ? "text-success" : "text-danger" },
              {
                label: "Return",
                value: `${totalReturn >= 0 ? "+" : ""}${totalReturn.toFixed(1)}%`,
                color: totalReturn >= 0 ? "text-success" : "text-danger",
              },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl border border-border bg-card p-4 text-center">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={cn("text-lg font-bold mt-1", stat.color)}>{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Investments table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-muted-foreground" /> Investments
              <span className="text-2xs text-muted-foreground font-normal">({client.investments?.length || 0})</span>
            </h3>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAddInvOpen(true)}>
              <Plus className="h-3 w-3" /> Add Investment
            </Button>
          </div>

          {client.investments?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
              <TrendingUp className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No investments recorded</p>
              <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={() => setAddInvOpen(true)}>
                Add first investment
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {client.investments?.map((inv: any) => {
                const ret = inv.currentValue
                  ? ((Number(inv.currentValue) - Number(inv.amount)) / Number(inv.amount) * 100)
                  : null;
                return (
                  <div key={inv.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-accent/30 transition-colors group">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{inv.schemeName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span>{inv.type.replace(/_/g, " ")}</span>
                        {inv.maturityDate && (
                          <span className={cn("flex items-center gap-1", new Date(inv.maturityDate) < new Date(Date.now() + 30 * 86400000) ? "text-amber-400" : "")}>
                            <Calendar className="h-3 w-3" />
                            {formatDate(inv.maturityDate, "short")}
                          </span>
                        )}
                        <span className={cn("px-1.5 py-0.5 rounded-full text-2xs", inv.status === "ACTIVE" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
                          {inv.status}
                        </span>
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{formatCurrency(Number(inv.amount))}</p>
                        {inv.currentValue && (
                          <p className={cn("text-xs mt-0.5 flex items-center gap-1 justify-end", ret && ret >= 0 ? "text-success" : "text-danger")}>
                            {ret && ret >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {formatCurrency(Number(inv.currentValue))}
                            {ret !== null && <span>({ret >= 0 ? "+" : ""}{ret.toFixed(1)}%)</span>}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => setEditingInv(inv)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-1 rounded"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MF Portfolio from CAMS + KFintech */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">📊 MF Portfolio (CAMS + KFintech)</h3>
        <FoliosSection clientId={client.id} />
      </div>

      {/* Modals */}
      <AddInvestmentModal open={addInvOpen} onClose={() => setAddInvOpen(false)} clientId={client.id} />
      <AddGoalModal open={addGoalOpen} onClose={() => setAddGoalOpen(false)} clientId={client.id} />
      {editingInv && (
        <EditInvestmentModal investment={editingInv} onClose={() => setEditingInv(null)} />
      )}
    </div>
  );
}

// ── Goal Row ──────────────────────────────────────────────────────────────────

function GoalRow({ goal, cfg, progress }: any) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteGoal(goal.id);
    if (result.success) { toast.success("Goal removed"); router.refresh(); }
    else toast.error("Failed");
    setDeleting(false);
  };

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <span className={cn("text-xs font-medium", cfg.color)}>{goal.title}</span>
        <div className="flex items-center gap-2">
          <span className="text-2xs text-muted-foreground">{progress}%</span>
          <button onClick={handleDelete} disabled={deleting}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-danger">
            {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
          </button>
        </div>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", cfg.bar)} style={{ width: `${progress}%` }} />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-2xs text-muted-foreground">{formatCurrency(Number(goal.currentAmount))}</span>
        <span className="text-2xs text-muted-foreground">{formatCurrency(Number(goal.targetAmount))}</span>
      </div>
    </div>
  );
}

// ── Add Investment Modal ──────────────────────────────────────────────────────

function AddInvestmentModal({ open, onClose, clientId }: any) {
  const router = useRouter();
  const { register, handleSubmit, setValue, reset, formState: { isSubmitting } } = useForm<Record<string,any>>({
    defaultValues: { startDate: new Date().toISOString().split("T")[0] },
  });

  const onSubmit = async (data: any) => {
    const result = await createInvestment(clientId, data);
    if (result.success) {
      toast.success("Investment added & AUM updated!");
      reset();
      onClose();
      router.refresh();
    } else toast.error(result.error || "Failed");
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Investment</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Scheme / Fund Name *</Label>
            <Input placeholder="Parag Parikh Flexi Cap Fund" {...register("schemeName", { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type *</Label>
              <Select onValueChange={v => setValue("type", v as any)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {INVESTMENT_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Invested Amount (₹) *</Label>
              <Input type="number" placeholder="500000" {...register("amount", { required: true })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Current Value (₹)</Label>
              <Input type="number" placeholder="580000" {...register("currentValue")} />
            </div>
            <div className="space-y-1.5">
              <Label>Start Date *</Label>
              <Input type="date" {...register("startDate", { required: true })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Maturity Date</Label>
            <Input type="date" {...register("maturityDate")} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input placeholder="Any notes about this investment" {...register("notes")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-brand-500 hover:bg-brand-600 text-white" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Add Investment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Investment Modal ─────────────────────────────────────────────────────

function EditInvestmentModal({ investment, onClose }: any) {
  const router = useRouter();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<Record<string,any>>({
    defaultValues: {
      schemeName: investment.schemeName,
      currentValue: investment.currentValue ? String(Number(investment.currentValue)) : "",
      status: investment.status,
      notes: investment.notes || "",
      maturityDate: investment.maturityDate ? new Date(investment.maturityDate).toISOString().split("T")[0] : "",
    },
  });

  const handleDelete = async () => {
    if (!confirm("Remove this investment?")) return;
    const result = await deleteInvestment(investment.id);
    if (result.success) { toast.success("Investment removed"); onClose(); router.refresh(); }
    else toast.error("Failed");
  };

  const onSubmit = async (data: any) => {
    const result = await updateInvestment(investment.id, data);
    if (result.success) { toast.success("Investment updated!"); onClose(); router.refresh(); }
    else toast.error(result.error || "Failed");
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Edit Investment</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Type</p>
            <p className="text-sm font-medium">{investment.type.replace(/_/g, " ")} · Invested {formatCurrency(Number(investment.amount))}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Scheme Name</Label>
            <Input {...register("schemeName")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Current Value (₹)</Label>
              <Input type="number" {...register("currentValue")} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" {...register("status")}>
                <option value="ACTIVE">Active</option>
                <option value="MATURED">Matured</option>
                <option value="WITHDRAWN">Withdrawn</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Maturity Date</Label>
            <Input type="date" {...register("maturityDate")} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input {...register("notes")} />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="sm" className="text-danger border-danger/20 hover:border-danger/40" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-brand-500 hover:bg-brand-600 text-white" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Goal Modal ────────────────────────────────────────────────────────────

function AddGoalModal({ open, onClose, clientId }: any) {
  const router = useRouter();
  const { register, handleSubmit, setValue, reset, formState: { isSubmitting } } = useForm<Record<string,any>>();

  const onSubmit = async (data: any) => {
    const result = await createGoal(clientId, data);
    if (result.success) {
      toast.success("Goal created!");
      reset();
      onClose();
      router.refresh();
    } else toast.error(result.error || "Failed");
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Financial Goal</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Goal Title *</Label>
            <Input placeholder="Aryan's IIT Engineering Fund" {...register("title", { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Goal Type</Label>
              <Select defaultValue="OTHER" onValueChange={v => setValue("goalType", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GOAL_TYPES.map(g => (
                    <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Target Amount (₹) *</Label>
              <Input type="number" placeholder="3500000" {...register("targetAmount", { required: true })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Current Corpus (₹)</Label>
              <Input type="number" placeholder="800000" {...register("currentAmount")} />
            </div>
            <div className="space-y-1.5">
              <Label>Target Date</Label>
              <Input type="date" {...register("targetDate")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input placeholder="IIT preferred, private college as backup" {...register("notes")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-brand-500 hover:bg-brand-600 text-white" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Goal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
