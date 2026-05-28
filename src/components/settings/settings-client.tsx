"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import {
  Activity,
  Bell,
  Check,
  Eye,
  EyeOff,
  Filter,
  Loader2,
  Lock,
  Monitor,
  Moon,
  Palette,
  Save,
  Shield,
  Sun,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn, getInitials, generateAvatarColor, formatDate } from "@/lib/utils";
import { updateProfile, updatePassword } from "@/actions/settings";

const ACTION_COLORS: Record<string, string> = {
  CREATE: "text-emerald-400 bg-emerald-500/10",
  UPDATE: "text-blue-400 bg-blue-500/10",
  DELETE: "text-danger bg-danger/10",
  STAGE_CHANGE: "text-amber-400 bg-amber-500/10",
  DOCUMENT_UPLOAD: "text-violet-400 bg-violet-500/10",
};

interface SettingsClientProps {
  user: any;
  auditLogs: any[];
}

export function SettingsClient({ user, auditLogs }: SettingsClientProps) {
  return (
    <Tabs defaultValue="profile" className="space-y-4">
      <TabsList className="bg-muted/50 border border-border h-9">
        {[
          { value: "profile", label: "Profile", icon: User },
          { value: "security", label: "Security", icon: Lock },
          { value: "notifications", label: "Notifications", icon: Bell },
          { value: "appearance", label: "Appearance", icon: Palette },
          { value: "audit", label: "Audit Trail", icon: Activity },
        ].map(({ value, label, icon: Icon }) => (
          <TabsTrigger key={value} value={value} className="text-xs h-7 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Icon className="h-3.5 w-3.5" />{label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="profile"><ProfileTab user={user} /></TabsContent>
      <TabsContent value="security"><SecurityTab /></TabsContent>
      <TabsContent value="notifications"><NotificationsTab /></TabsContent>
      <TabsContent value="appearance"><AppearanceTab /></TabsContent>
      <TabsContent value="audit"><AuditTab logs={auditLogs} /></TabsContent>
    </Tabs>
  );
}

function ProfileTab({ user }: { user: any }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit } = useForm<Record<string,any>>({
    defaultValues: { name: user?.name || "", email: user?.email || "" }});

  const onSubmit = async (data: any) => {
    setSaving(true);
    const result = await updateProfile(data);
    if (result.success) { toast.success("Profile updated"); router.refresh(); }
    else toast.error(result.error || "Failed to update");
    setSaving(false);
  };

  return (
    <div className="rounded-xl border border-border bg-card divide-y divide-border">
      {/* Avatar */}
      <div className="p-6 flex items-center gap-5">
        <div className={cn("w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white text-xl font-bold flex-shrink-0", generateAvatarColor(user?.id || "u"))}>
          {getInitials(user?.name)}
        </div>
        <div>
          <p className="font-semibold text-foreground">{user?.name}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-2xs bg-brand-500/10 text-brand-400 border border-brand-500/20 px-2 py-0.5 rounded-full font-medium">{user?.role}</span>
            <span className="text-2xs text-muted-foreground">Member since {formatDate(user?.createdAt, "medium")}</span>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input placeholder="Your name" {...register("name", { required: true })} />
          </div>
          <div className="space-y-1.5">
            <Label>Email Address</Label>
            <Input type="email" placeholder="you@example.com" {...register("email", { required: true })} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="sm" className="bg-brand-500 hover:bg-brand-600 text-white" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Profile
          </Button>
        </div>
      </form>
    </div>
  );
}

function SecurityTab() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset } = useForm<Record<string,any>>();

  const onSubmit = async (data: any) => {
    if (data.newPassword !== data.confirmPassword) { toast.error("Passwords don't match"); return; }
    setSaving(true);
    const result = await updatePassword(data.currentPassword, data.newPassword);
    if (result.success) { toast.success("Password updated successfully"); reset(); }
    else toast.error(result.error || "Failed to update password");
    setSaving(false);
  };

  return (
    <div className="rounded-xl border border-border bg-card divide-y divide-border">
      <div className="p-6">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Shield className="h-4 w-4 text-muted-foreground" />Change Password</h3>
        <p className="text-xs text-muted-foreground mt-1">Keep your account secure with a strong password</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 max-w-sm">
        <div className="space-y-1.5">
          <Label>Current Password</Label>
          <div className="relative">
            <Input type={showCurrent ? "text" : "password"} placeholder="Your current password" className="pr-9" {...register("currentPassword", { required: true })} />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>New Password</Label>
          <div className="relative">
            <Input type={showNew ? "text" : "password"} placeholder="Min. 8 characters" className="pr-9" {...register("newPassword", { required: true, minLength: 8 })} />
            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Confirm New Password</Label>
          <Input type="password" placeholder="Repeat new password" {...register("confirmPassword", { required: true })} />
        </div>
        <Button type="submit" size="sm" className="bg-brand-500 hover:bg-brand-600 text-white" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Update Password
        </Button>
      </form>
      <div className="p-6 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Two-Factor Authentication</h3>
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <p className="text-sm font-medium text-foreground">Authenticator App</p>
            <p className="text-xs text-muted-foreground mt-0.5">Use an authenticator app for extra security</p>
          </div>
          <Button size="sm" variant="outline" className="text-xs">Enable 2FA</Button>
        </div>
      </div>
    </div>
  );
}

function NotificationsTab() {
  const notifications = [
    { id: "task_due", label: "Task reminders", desc: "Get notified when tasks are due", defaultOn: true },
    { id: "lead_activity", label: "Lead activity", desc: "Updates when lead stage changes", defaultOn: true },
    { id: "client_birthday", label: "Client birthdays", desc: "Birthday and anniversary reminders", defaultOn: true },
    { id: "kyc_expiry", label: "KYC expiry alerts", desc: "Alerts before KYC documents expire", defaultOn: true },
    { id: "investment_maturity", label: "Investment maturity", desc: "Alerts for upcoming maturity dates", defaultOn: true },
    { id: "weekly_digest", label: "Weekly digest", desc: "Summary of your week every Monday", defaultOn: false },
    { id: "product_updates", label: "Product updates", desc: "New features and improvements", defaultOn: false },
  ];
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(notifications.map((n) => [n.id, n.defaultOn]))
  );
  return (
    <div className="rounded-xl border border-border bg-card divide-y divide-border">
      <div className="p-6">
        <h3 className="text-sm font-semibold text-foreground">Notification Preferences</h3>
        <p className="text-xs text-muted-foreground mt-1">Choose what you want to be notified about</p>
      </div>
      <div className="divide-y divide-border">
        {notifications.map((item) => (
          <div key={item.id} className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
            </div>
            <Switch checked={prefs[item.id]} onCheckedChange={(v) => { setPrefs((p) => ({ ...p, [item.id]: v })); toast.success("Preference saved"); }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function AppearanceTab() {
  const { theme, setTheme } = useTheme();
  const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];
  return (
    <div className="rounded-xl border border-border bg-card divide-y divide-border">
      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Theme</h3>
          <p className="text-xs text-muted-foreground mt-1">Choose your preferred color scheme</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {themes.map(({ value, label, icon: Icon }) => (
            <button key={value} onClick={() => setTheme(value)}
              className={cn("flex flex-col items-center gap-2.5 rounded-xl border-2 p-4 transition-all",
                theme === value ? "border-brand-500 bg-brand-500/5" : "border-border hover:border-muted-foreground/30")}>
              <Icon className={cn("h-5 w-5", theme === value ? "text-brand-400" : "text-muted-foreground")} />
              <span className={cn("text-xs font-medium", theme === value ? "text-brand-400" : "text-muted-foreground")}>{label}</span>
              {theme === value && <Check className="h-3.5 w-3.5 text-brand-400 -mt-1" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuditTab({ logs }: { logs: any[] }) {
  const [filter, setFilter] = useState("");

  const filtered = filter
    ? logs.filter((l) => l.action === filter || l.entityType === filter)
    : logs;

  const entityTypes = [...new Set(logs.map((l) => l.entityType))];
  const actions = [...new Set(logs.map((l) => l.action))];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Audit Trail
          </h3>
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-xs border border-border rounded-md px-2 py-1 bg-background text-foreground"
            >
              <option value="">All actions</option>
              {actions.map((a) => <option key={a} value={a}>{a}</option>)}
              {entityTypes.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} log entries</p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-12 text-center">
          <Activity className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No audit logs yet</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map((log) => {
              const actionColor = ACTION_COLORS[log.action] || "text-muted-foreground bg-muted";
              return (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-accent/30 transition-colors">
                  <span className={cn("text-2xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5", actionColor)}>
                    {log.action}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">
                      {log.entityName || log.entityId}
                      <span className="text-muted-foreground font-normal ml-1.5">({log.entityType})</span>
                    </p>
                    <p className="text-2xs text-muted-foreground mt-0.5">
                      {formatDate(log.createdAt, "relative")} · {new Date(log.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className="text-2xs text-muted-foreground flex-shrink-0">{formatDate(log.createdAt, "short")}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
