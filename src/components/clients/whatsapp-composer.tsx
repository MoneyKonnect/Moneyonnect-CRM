"use client";

import { useState } from "react";
import {
  MessageSquare,
  Send,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const TEMPLATES = [
  {
    category: "Portfolio",
    templates: [
      { name: "Portfolio Review", body: "Hi {name}! 👋 Your quarterly portfolio review is due. Let's schedule a call to discuss your investments and make sure everything is aligned with your financial goals. When are you available this week?" },
      { name: "Investment Update", body: "Dear {name}, I wanted to share a quick update on your portfolio performance. Your investments are looking healthy — let's connect for a detailed discussion. Please let me know your convenient time." },
      { name: "SIP Step-Up Reminder", body: "Hi {name}! 🚀 Your annual SIP step-up is due. Increasing your SIP by just 10% this year can significantly boost your long-term corpus. Shall I prepare the revised mandate for you?" },
    ],
  },
  {
    category: "Birthdays & Events",
    templates: [
      { name: "Birthday Wishes", body: "Dear {name}, wishing you a very Happy Birthday! 🎂🎉 May this year bring you great health, happiness, and financial prosperity. It's a wonderful time to review your financial goals for the year ahead. Best wishes!" },
      { name: "Anniversary", body: "Hi {name}! Congratulations on your anniversary! 💐 It's a great milestone to review your family's financial plan together. Would you like to schedule a review call soon?" },
      { name: "New Year", body: "Dear {name}, wishing you and your family a very Happy New Year! 🎊 As we enter the new financial year, let's review your investments and set fresh goals. Looking forward to our continued association!" },
    ],
  },
  {
    category: "Compliance & KYC",
    templates: [
      { name: "KYC Renewal", body: "Dear {name}, your KYC documents are due for renewal. This is mandatory to keep your investments active and compliant. Kindly arrange for the updated documents at your earliest convenience. I can assist you through the process." },
      { name: "Document Request", body: "Hi {name}, I hope you're doing well! To complete your onboarding, I need a few documents from your end — specifically {documents}. Could you please share them at your earliest? Happy to guide you through the process." },
      { name: "FATCA Compliance (NRI)", body: "Dear {name}, as per regulatory requirements, we need to update your FATCA compliance details. This is mandatory for all NRI clients. Could we schedule a brief call this week to complete this? It should take only 15 minutes." },
    ],
  },
  {
    category: "Lead Follow-up",
    templates: [
      { name: "First Follow-up", body: "Hi {name}! Great connecting with you. As discussed, I'm sharing some information about our financial planning services. We work with professionals like yourself to build long-term wealth through a structured approach. When can we have a detailed chat?" },
      { name: "Warm Follow-up", body: "Dear {name}, just checking in to see if you had a chance to review the proposal I shared. I'm happy to answer any questions or customize the plan further based on your specific goals. Please feel free to reach out!" },
      { name: "Meeting Confirmation", body: "Hi {name}! Confirming our meeting on {date} at {time}. Looking forward to discussing your financial goals. Please let me know if you need to reschedule. See you soon! 🗓️" },
    ],
  },
];

interface WhatsAppComposerProps {
  phone: string;
  clientName: string;
  open: boolean;
  onClose: () => void;
}

export function WhatsAppComposer({ phone, clientName, open, onClose }: WhatsAppComposerProps) {
  const [message, setMessage] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const personalizedMessage = message.replace(/\{name\}/g, clientName.split(" ")[0]);

  const applyTemplate = (body: string) => {
    setMessage(body);
  };

  const handleSend = () => {
    if (!message.trim()) return;
    const encodedMsg = encodeURIComponent(personalizedMessage);
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMsg}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-emerald-400" />
            </div>
            MessageSquare to {clientName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Quick templates */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Templates</p>
            <div className="space-y-2">
              {TEMPLATES.map((cat) => (
                <div key={cat.category}>
                  <button
                    onClick={() => setSelectedCategory(selectedCategory === cat.category ? null : cat.category)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 hover:bg-accent transition-colors text-left"
                  >
                    <span className="text-xs font-medium text-foreground">{cat.category}</span>
                    <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform",
                      selectedCategory === cat.category && "rotate-180")} />
                  </button>
                  {selectedCategory === cat.category && (
                    <div className="mt-1 space-y-1 pl-2">
                      {cat.templates.map((t) => (
                        <button
                          key={t.name}
                          onClick={() => applyTemplate(t.body)}
                          className="w-full text-left px-3 py-2 rounded-lg border border-border hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-colors"
                        >
                          <p className="text-xs font-semibold text-foreground">{t.name}</p>
                          <p className="text-2xs text-muted-foreground mt-0.5 line-clamp-1">{t.body.substring(0, 80)}…</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Message editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Message</p>
              {message && (
                <button onClick={() => setMessage("")} className="text-2xs text-muted-foreground hover:text-danger transition-colors">
                  Clear
                </button>
              )}
            </div>
            <Textarea
              placeholder="Type your message or select a template above…"
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="min-h-[140px] resize-none text-sm font-mono"
            />
            <p className="text-2xs text-muted-foreground">
              {"{name}"} will be replaced with <span className="text-brand-400">{clientName.split(" ")[0]}</span>
              {" · "}{message.replace(/\{name\}/g, clientName.split(" ")[0]).length} chars
            </p>
          </div>

          {/* Preview */}
          {message && (
            <div className="rounded-xl bg-[#075e54]/10 border border-[#075e54]/20 p-4">
              <p className="text-2xs font-semibold text-emerald-400 mb-2">Preview</p>
              <div className="bg-[#dcf8c6] dark:bg-emerald-900/30 rounded-xl rounded-tr-sm px-3 py-2 max-w-xs ml-auto">
                <p className="text-xs text-gray-800 dark:text-foreground leading-relaxed whitespace-pre-wrap">{personalizedMessage}</p>
                <p className="text-2xs text-gray-500 dark:text-muted-foreground text-right mt-1">
                  {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
            Opens MessageSquare · {phone}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5"
              onClick={handleSend}
              disabled={!message.trim()}
            >
              <Send className="h-3.5 w-3.5" />
              Open in MessageSquare
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
