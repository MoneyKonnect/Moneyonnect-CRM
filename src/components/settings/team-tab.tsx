"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Users, Mail, Trash2, Shield, ChevronDown, Loader2, Clock } from "lucide-react";
import { cn, getInitials, generateAvatarColor, formatDate } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-violet-500/15 text-violet-400",
  ADMIN: "bg-brand-500/15 text-brand-400",
};

export function TeamTab({ currentUser }: { currentUser: any }) {
  const [users, setUsers] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  const fetchTeam = async () => {
    try {
      const res = await fetch("/api/team/members");
      const data = await res.json();
      setUsers(data.users || []);
      setPendingInvites(data.pendingInvites || []);
    } catch {
      toast.error("Failed to load team");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTeam(); }, []);

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      const res = await fetch("/api/team/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success("Role updated");
      fetchTeam();
    } catch {
      toast.error("Failed to update role");
    }
  };

  const handleRemove = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from the team?`)) return;
    try {
      const res = await fetch("/api/team/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(`${name} removed`);
      fetchTeam();
    } catch {
      toast.error("Failed to remove member");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">


      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Pending Invites ({pendingInvites.length})
          </h3>
          <div className="space-y-2">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-dashed border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-foreground">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Expires {formatDate(invite.expiresAt)}
                    </p>
                  </div>
                </div>
                <span className={cn("text-2xs font-semibold px-2 py-0.5 rounded-full", ROLE_COLORS[invite.role])}>
                  {ROLE_LABELS[invite.role]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team members */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> Team Members ({users.length})
        </h3>
        <div className="space-y-2">
          {users.map((member) => {
            const isCurrentUser = member.id === currentUser?.id;
            const initials = getInitials(member.name || member.email);
            const avatarColor = generateAvatarColor(member.id);

            return (
              <div key={member.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white", avatarColor)}>
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {member.name || "—"}
                      {isCurrentUser && <span className="ml-2 text-2xs text-muted-foreground">(you)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isSuperAdmin && !isCurrentUser ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value)}
                      className="h-7 px-2 text-xs border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value="SUPER_ADMIN">Super Admin</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  ) : (
                    <span className={cn("text-2xs font-semibold px-2 py-0.5 rounded-full", ROLE_COLORS[member.role])}>
                      {ROLE_LABELS[member.role]}
                    </span>
                  )}
                  {isSuperAdmin && !isCurrentUser && (
                    <button
                      onClick={() => handleRemove(member.id, member.name || member.email)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
