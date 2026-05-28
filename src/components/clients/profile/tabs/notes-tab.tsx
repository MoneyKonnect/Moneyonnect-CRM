"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  Edit2,
  Loader2,
  Pin,
  PinOff,
  Plus,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, getInitials, generateAvatarColor, cn } from "@/lib/utils";
import { createNote, deleteNote, toggleNotePin, updateNote } from "@/actions/notes";

interface NotesTabProps { client: any; }

export function NotesTab({ client }: NotesTabProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    const result = await createNote(client.id, content.trim());
    if (result.success) {
      toast.success("Note saved");
      setContent("");
      router.refresh();
    } else toast.error("Failed to save note");
    setSubmitting(false);
  };

  const handleDelete = async (noteId: string) => {
    const result = await deleteNote(noteId);
    if (result.success) { toast.success("Note deleted"); router.refresh(); }
    else toast.error("Failed to delete");
  };

  const handlePin = async (noteId: string) => {
    const result = await toggleNotePin(noteId);
    if (result.success) router.refresh();
    else toast.error("Failed to update");
  };

  const pinnedNotes = client.notes?.filter((n: any) => n.isPinned) || [];
  const regularNotes = client.notes?.filter((n: any) => !n.isPinned) || [];

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Composer */}
      <div className="rounded-xl border border-border bg-card p-4">
        <Textarea
          placeholder="Add a note about this client… (⌘+Enter to save)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[80px] resize-none border-0 shadow-none focus-visible:ring-0 p-0 text-sm"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(); }}
        />
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <p className="text-2xs text-muted-foreground">⌘ + Enter to save</p>
          <Button
            size="sm"
            className="h-7 bg-brand-500 hover:bg-brand-600 text-white text-xs gap-1.5"
            onClick={handleSubmit}
            disabled={!content.trim() || submitting}
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Save Note
          </Button>
        </div>
      </div>

      {/* Pinned */}
      {pinnedNotes.length > 0 && (
        <div className="space-y-2">
          <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Pin className="h-3 w-3" /> Pinned
          </p>
          {pinnedNotes.map((note: any) => (
            <NoteCard key={note.id} note={note} onDelete={handleDelete} onPin={handlePin} />
          ))}
        </div>
      )}

      {/* Regular */}
      {regularNotes.length > 0 && (
        <div className="space-y-2">
          {pinnedNotes.length > 0 && (
            <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">All Notes</p>
          )}
          {regularNotes.map((note: any) => (
            <NoteCard key={note.id} note={note} onDelete={handleDelete} onPin={handlePin} />
          ))}
        </div>
      )}

      {client.notes?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <StickyNote className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No notes yet — add your first note above</p>
        </div>
      )}
    </div>
  );
}

function NoteCard({ note, onDelete, onPin }: { note: any; onDelete: (id: string) => void; onPin: (id: string) => void }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editContent.trim()) return;
    setSaving(true);
    const result = await updateNote(note.id, editContent.trim());
    if (result.success) {
      toast.success("Note updated");
      setEditing(false);
      router.refresh();
    } else toast.error("Failed to update");
    setSaving(false);
  };

  return (
    <div className={cn(
      "rounded-xl border bg-card p-4 group hover:shadow-card transition-shadow",
      note.isPinned ? "border-amber-500/20 bg-amber-500/5" : "border-border"
    )}>
      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[80px] resize-none text-sm"
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditing(false); setEditContent(note.content); }}>
              <X className="h-3.5 w-3.5 mr-1" /> Cancel
            </Button>
            <Button size="sm" className="h-7 bg-brand-500 hover:bg-brand-600 text-white text-xs" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
              Save
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-foreground leading-relaxed flex-1 whitespace-pre-wrap">{note.content}</p>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button onClick={() => setEditing(true)} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => onPin(note.id)} className={cn("p-1 rounded transition-colors", note.isPinned ? "text-amber-400 hover:text-muted-foreground" : "text-muted-foreground hover:text-amber-400")}>
                {note.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              </button>
              <button onClick={() => onDelete(note.id)} className="p-1 rounded text-muted-foreground hover:text-danger transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <div className={cn("w-5 h-5 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-2xs font-semibold", generateAvatarColor(note.authorId))}>
              {getInitials(note.author?.name)}
            </div>
            <span className="text-2xs text-muted-foreground">{note.author?.name} · {formatDate(note.createdAt, "relative")}</span>
            {note.isPinned && <Pin className="h-3 w-3 text-amber-400 ml-auto" />}
          </div>
        </>
      )}
    </div>
  );
}
