"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { X, Send, Loader2, Paperclip, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { sendBirthdayWish } from "@/actions/intelligence";

interface BirthdayWishModalProps {
  open: boolean;
  onClose: () => void;
  recipientName: string;
  recipientEmail: string;
}

function defaultMessage(name: string) {
  const firstName = name.split(" ")[0];
  return `Dear ${firstName},

Wishing you a very Happy Birthday! May this year bring you good health, happiness, and continued success.

Thank you for being a valued part of the MoneyKonnect family. We look forward to continuing to support your financial journey.

Warm regards,
Team MoneyKonnect`;
}

export function BirthdayWishModal({ open, onClose, recipientName, recipientEmail }: BirthdayWishModalProps) {
  const [message, setMessage] = useState(() => defaultMessage(recipientName));
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Message cannot be empty");
      return;
    }
    setSending(true);

    const formData = new FormData();
    formData.set("to", recipientEmail);
    formData.set("name", recipientName);
    formData.set("message", message.trim());
    if (file) formData.set("attachment", file);

    const result = await sendBirthdayWish(formData);

    if (result.success) {
      toast.success(`Birthday wish sent to ${recipientName}!`);
      onClose();
    } else {
      toast.error(result.error || "Failed to send email");
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center">
              <Gift className="h-4 w-4 text-pink-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Send Birthday Wish</p>
              <p className="text-2xs text-muted-foreground">{recipientEmail}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[180px] text-sm resize-none"
              disabled={sending}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Attachment (optional)</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
              >
                <Paperclip className="h-3.5 w-3.5" />
                {file ? "Change file" : "Attach file"}
              </Button>
              {file && (
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {file.name}
                </span>
              )}
              {file && (
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-xs text-danger hover:underline"
                  disabled={sending}
                >
                  Remove
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-brand-500 hover:bg-brand-600 text-white gap-1.5"
            onClick={handleSend}
            disabled={sending || !message.trim()}
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {sending ? "Sending…" : "Send Wish"}
          </Button>
        </div>
      </div>
    </div>
  );
}
