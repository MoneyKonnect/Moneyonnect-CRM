"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  Clock,
  Download,
  Eye,
  File,
  FileLock,
  FileText,
  FileWarning,
  Loader2,
  Plus,
  Search,
  Shield,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn, formatDate, getInitials, generateAvatarColor } from "@/lib/utils";
import Link from "next/link";
import { searchClients } from "@/actions/clients";

const DOC_TYPES = [
  "PAN", "AADHAAR", "PASSPORT", "KYC", "BANK_STATEMENT",
  "ITR", "AGREEMENT", "FORM_16", "INSURANCE_POLICY", "OTHER",
];

const DOC_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  PAN: { label: "PAN Card", icon: FileLock, color: "text-blue-400", bg: "bg-blue-500/10" },
  AADHAAR: { label: "Aadhaar", icon: FileLock, color: "text-violet-400", bg: "bg-violet-500/10" },
  PASSPORT: { label: "Passport", icon: FileLock, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  KYC: { label: "KYC Document", icon: Shield, color: "text-amber-400", bg: "bg-amber-500/10" },
  BANK_STATEMENT: { label: "Bank Statement", icon: FileText, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  ITR: { label: "ITR", icon: FileText, color: "text-orange-400", bg: "bg-orange-500/10" },
  AGREEMENT: { label: "Agreement", icon: FileText, color: "text-rose-400", bg: "bg-rose-500/10" },
  FORM_16: { label: "Form 16", icon: FileText, color: "text-pink-400", bg: "bg-pink-500/10" },
  INSURANCE_POLICY: { label: "Insurance", icon: Shield, color: "text-teal-400", bg: "bg-teal-500/10" },
  OTHER: { label: "Other", icon: FileText, color: "text-muted-foreground", bg: "bg-muted" },
};

interface DocumentsClientProps { documents: any[]; }

export function DocumentsClient({ documents }: DocumentsClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);

  const filtered = documents.filter(d =>
    !search ||
    d.fileName.toLowerCase().includes(search.toLowerCase()) ||
    d.client?.fullName.toLowerCase().includes(search.toLowerCase()) ||
    d.docType.toLowerCase().includes(search.toLowerCase())
  );

  const expiringCount = documents.filter(d =>
    d.expiresAt && new Date(d.expiresAt) < new Date(Date.now() + 30 * 86400000)
  ).length;

  const handleDelete = async (docId: string, fileName: string) => {
    if (!confirm(`Remove document "${fileName}"?`)) return;
    const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Document removed"); router.refresh(); }
    else toast.error("Failed to remove");
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Document Vault</h1>
            <p className="text-sm text-muted-foreground">
              {documents.length} documents
              {expiringCount > 0 && <span className="text-warning ml-1.5">· {expiringCount} expiring soon</span>}
            </p>
          </div>
        </div>
        <Button size="sm" className="h-8 bg-brand-500 hover:bg-brand-600 text-white text-xs gap-1.5 shadow-glow-sm" onClick={() => setUploadOpen(true)}>
          <Upload className="h-3.5 w-3.5" /> Upload Document
        </Button>
      </div>

      {/* Security notice */}
      <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
        <Shield className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-emerald-400">
          All documents are encrypted at rest with AES-256. Aadhaar numbers are stored as one-way hashes and never in plaintext.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input placeholder="Search by name, client, type…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
      </div>

      {/* Doc type stats */}
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
        {Object.entries(DOC_TYPE_CONFIG).map(([type, cfg]) => {
          const count = documents.filter(d => d.docType === type).length;
          const Icon = cfg.icon;
          return (
            <div key={type} className={cn("rounded-lg border p-2 text-center transition-colors cursor-pointer hover:shadow-card",
              count > 0 ? "border-border" : "border-border/50 opacity-50")}>
              <div className={cn("w-6 h-6 rounded-md mx-auto flex items-center justify-center mb-1", cfg.bg)}>
                <Icon className={cn("h-3 w-3", cfg.color)} />
              </div>
              <p className={cn("text-sm font-bold", cfg.color)}>{count}</p>
              <p className="text-2xs text-muted-foreground leading-tight hidden sm:block">{cfg.label}</p>
            </div>
          );
        })}
      </div>

      {/* Document list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <h3 className="font-medium text-foreground mb-1">{search ? "No documents match" : "No documents yet"}</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Upload KYC documents, PAN cards, passports, and other client documents securely.</p>
          {!search && (
            <Button size="sm" variant="outline" className="mt-4 text-xs gap-1.5" onClick={() => setUploadOpen(true)}>
              <Upload className="h-3.5 w-3.5" /> Upload first document
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Document</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Client</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Uploaded</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Expires</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Security</th>
                <th className="w-16 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(doc => {
                const cfg = DOC_TYPE_CONFIG[doc.docType] || DOC_TYPE_CONFIG.OTHER;
                const Icon = cfg.icon;
                const isExpiringSoon = doc.expiresAt && new Date(doc.expiresAt) < new Date(Date.now() + 30 * 86400000);
                const isExpired = doc.expiresAt && new Date(doc.expiresAt) < new Date();
                const sizeKB = doc.fileSize ? (doc.fileSize / 1024).toFixed(0) : null;
                return (
                  <tr key={doc.id} className="hover:bg-accent/30 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", cfg.bg)}>
                          <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{doc.fileName}</p>
                          <p className={cn("text-2xs font-medium", cfg.color)}>
                            {cfg.label}{sizeKB ? ` · ${sizeKB} KB` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {doc.client && (
                        <Link href={`/clients/${doc.client.id}`} className="flex items-center gap-2 hover:text-brand-400 transition-colors">
                          <div className={cn("w-5 h-5 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-2xs font-semibold flex-shrink-0", generateAvatarColor(doc.client.id))}>
                            {getInitials(doc.client.fullName)}
                          </div>
                          <span className="text-xs text-muted-foreground">{doc.client.fullName}</span>
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                      {formatDate(doc.createdAt, "medium")}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {doc.expiresAt ? (
                        <span className={cn("text-xs flex items-center gap-1",
                          isExpired ? "text-danger" : isExpiringSoon ? "text-warning" : "text-muted-foreground")}>
                          <Clock className="h-3 w-3" />
                          {isExpired ? "Expired " : isExpiringSoon ? "Expires " : ""}
                          {formatDate(doc.expiresAt, "short")}
                        </span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {doc.encrypted ? (
                        <span className="text-2xs font-medium flex items-center gap-1 text-emerald-400">
                          <Shield className="h-3 w-3" /> Encrypted
                        </span>
                      ) : <span className="text-2xs text-muted-foreground">Unencrypted</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(doc.id, doc.fileName)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-danger p-1 rounded">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <UploadDocumentModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </>
  );
}

// ── Upload Document Modal ─────────────────────────────────────────────────────

function UploadDocumentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [expiresAt, setExpiresAt] = useState("");
  const [uploading, setUploading] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<any>(null);

  const handleClientSearch = async (q: string) => {
    setClientSearch(q);
    clearTimeout(searchTimer.current);
    if (q.length < 2) { setClientResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const results = await searchClients(q);
      setClientResults(results);
      setSearching(false);
    }, 250);
  };

  const handleUpload = async () => {
    if (!file || !docType || !selectedClient) {
      toast.error("Please select a file, document type, and client");
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("docType", docType);
    formData.append("clientId", selectedClient.id);
    if (expiresAt) formData.append("expiresAt", expiresAt);

    const res = await fetch("/api/documents/upload", { method: "POST", body: formData });
    const result = await res.json();
    if (result.success) {
      toast.success(`${file.name} uploaded successfully!`);
      onClose();
      router.refresh();
      setFile(null); setDocType(""); setSelectedClient(null); setExpiresAt("");
    } else toast.error(result.error || "Upload failed");
    setUploading(false);
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {/* File drop zone */}
          <div
            className={cn("border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors hover:border-brand-500/50 hover:bg-brand-500/5",
              file ? "border-emerald-500/50 bg-emerald-500/5" : "border-border")}
            onClick={() => fileRef.current?.click()}
          >
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <Check className="h-5 w-5 text-emerald-400" />
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button className="ml-auto text-muted-foreground hover:text-danger" onClick={e => { e.stopPropagation(); setFile(null); }}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">Click to select file</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, DOCX up to 10MB</p>
              </>
            )}
            <input ref={fileRef} type="file" className="sr-only" accept=".pdf,.jpg,.jpeg,.png,.docx"
              onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>

          {/* Document type */}
          <div className="space-y-1.5">
            <Label>Document Type *</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map(t => (
                  <SelectItem key={t} value={t}>
                    {DOC_TYPE_CONFIG[t]?.label || t.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client search */}
          <div className="space-y-1.5">
            <Label>Client *</Label>
            {selectedClient ? (
              <div className="flex items-center gap-2 p-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                <div className={cn("w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-2xs font-bold flex-shrink-0", generateAvatarColor(selectedClient.id))}>
                  {getInitials(selectedClient.fullName)}
                </div>
                <span className="text-sm font-medium flex-1">{selectedClient.fullName}</span>
                <button onClick={() => setSelectedClient(null)} className="text-muted-foreground hover:text-danger">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Input placeholder="Search client…" value={clientSearch} onChange={e => handleClientSearch(e.target.value)} className="h-9 text-sm" />
                {searching && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                {clientResults.length > 0 && (
                  <div className="absolute top-full mt-1 w-full rounded-lg border border-border bg-card shadow-lg z-50 max-h-32 overflow-y-auto">
                    {clientResults.map(c => (
                      <button key={c.id} onClick={() => { setSelectedClient(c); setClientSearch(""); setClientResults([]); }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent transition-colors text-left">
                        <div className={cn("w-5 h-5 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-2xs font-bold flex-shrink-0", generateAvatarColor(c.id))}>
                          {getInitials(c.fullName)}
                        </div>
                        <span className="text-xs">{c.fullName}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Expiry date */}
          <div className="space-y-1.5">
            <Label>Expiry Date (optional)</Label>
            <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-brand-500 hover:bg-brand-600 text-white gap-1.5"
            onClick={handleUpload}
            disabled={uploading || !file || !docType || !selectedClient}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Uploading…" : "Upload Document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
