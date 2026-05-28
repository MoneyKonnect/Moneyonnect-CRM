import Link from "next/link";
import {
  ArrowRight,
  Phone,
  Mail,
  MessageSquare,
  Users,
  Video,
} from "lucide-react";
import { cn, formatDate, getInitials, generateAvatarColor } from "@/lib/utils";

const CHANNEL_CONFIG = {
  PHONE: { icon: Phone, color: "text-blue-400" },
  EMAIL: { icon: Mail, color: "text-violet-400" },
  WHATSAPP: { icon: MessageSquare, color: "text-emerald-400" },
  IN_PERSON: { icon: Users, color: "text-amber-400" },
  VIDEO_CALL: { icon: Video, color: "text-cyan-400" },
  SMS: { icon: MessageSquare, color: "text-muted-foreground" },
};

interface ActivityFeedProps {
  interactions: any[];
}

export function ActivityFeed({ interactions }: ActivityFeedProps) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="font-semibold text-sm text-foreground">Recent Activity</h2>
        <Link
          href="/clients"
          className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="divide-y divide-border">
        {interactions.length === 0 ? (
          <div className="px-5 py-6 text-center">
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </div>
        ) : (
          interactions.slice(0, 6).map((interaction) => {
            const channelCfg =
              CHANNEL_CONFIG[interaction.channel as keyof typeof CHANNEL_CONFIG] ||
              CHANNEL_CONFIG.PHONE;
            const Icon = channelCfg.icon;

            return (
              <Link
                key={interaction.id}
                href={`/clients/${interaction.clientId}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-accent/50 transition-colors"
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-semibold flex-shrink-0",
                    generateAvatarColor(interaction.clientId)
                  )}
                >
                  {getInitials(interaction.client?.fullName)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground font-medium truncate">
                    {interaction.client?.fullName}
                  </p>
                  <p className="text-2xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                    <Icon className={cn("h-3 w-3", channelCfg.color)} />
                    {interaction.summary || interaction.channel.toLowerCase()}
                  </p>
                </div>

                {/* Time */}
                <span className="text-2xs text-muted-foreground flex-shrink-0">
                  {formatDate(interaction.occurredAt, "relative")}
                </span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
