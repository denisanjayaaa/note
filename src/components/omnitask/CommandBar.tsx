import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Image,
  Paperclip,
  Mic,
  FileText,
  ListChecks,
  Wallet,
  CalendarDays,
  X,
  ArrowRight,
} from "lucide-react";
import { parseNaturalInput, type ParsedIntent } from "@/lib/deepseek";
import type { Task } from "./data";

// ─── Types ───

interface CommandBarProps {
  onAddTask: (title: string, priority: Task["priority"], dueDate?: string) => Promise<void>;
  onAddNote: (title: string, content: string) => Promise<void>;
  onAddTransaction: (type: "income" | "expense", amount: number, category: string, description: string) => Promise<void>;
  compact?: boolean;
}

type Status = "idle" | "loading" | "success" | "error";

// ─── Attachment Types ───

type Attachment = {
  type: "image" | "file" | "audio";
  name: string;
  data?: string;
};

// ─── Priority Badge ───

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    high: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    low: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${styles[priority] || styles.medium}`}>
      {priority}
    </span>
  );
}

// ─── Parsed Result Preview ───

function ParsedResultPreview({
  result,
  onConfirm,
  onDismiss,
}: {
  result: ParsedIntent;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      className="mt-3 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-amber-500" />
          <span className="text-xs font-semibold">AI Analysis Result</span>
        </div>
        <button onClick={onDismiss} className="rounded p-1 text-muted-foreground hover:bg-accent">
          <X size={14} />
        </button>
      </div>

      {/* Summary */}
      <div className="border-b border-border/50 bg-muted/20 px-4 py-2">
        <p className="text-xs text-muted-foreground">{result.summary}</p>
      </div>

      {/* Items */}
      <div className="space-y-1.5 p-3">
        {result.note && (
          <div className="flex items-start gap-2.5 rounded-lg border border-border/50 bg-amber-50/30 p-2.5 dark:bg-amber-500/5">
            <FileText size={14} className="mt-0.5 shrink-0 text-amber-500" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium">Note: {result.note.title}</p>
              {result.note.content && (
                <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{result.note.content}</p>
              )}
            </div>
          </div>
        )}

        {result.task && (
          <div className="flex items-start gap-2.5 rounded-lg border border-border/50 bg-sky-50/30 p-2.5 dark:bg-sky-500/5">
            <ListChecks size={14} className="mt-0.5 shrink-0 text-sky-500" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium">Task: {result.task.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <PriorityBadge priority={result.task.priority} />
                {result.task.due_date && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <CalendarDays size={10} />
                    {new Date(result.task.due_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {result.transaction && (
          <div className="flex items-start gap-2.5 rounded-lg border border-border/50 bg-emerald-50/30 p-2.5 dark:bg-emerald-500/5">
            <Wallet size={14} className="mt-0.5 shrink-0 text-emerald-500" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium">
                {result.transaction.type === "income" ? "Income" : "Expense"}:{" "}
                Rp {result.transaction.amount.toLocaleString("id-ID")}
              </p>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>{result.transaction.category}</span>
                <span>·</span>
                <span>{result.transaction.description}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirm button */}
      <div className="border-t border-border px-3 py-2.5">
        <button
          onClick={onConfirm}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2 text-xs font-semibold text-background transition-all hover:opacity-90"
        >
          <CheckCircle2 size={14} />
          Confirm & Create All
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───

export function CommandBar({ onAddTask, onAddNote, onAddTransaction, compact }: CommandBarProps) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ParsedIntent | null>(null);
  const [error, setError] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showAttachments, setShowAttachments] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on desktop
  useEffect(() => {
    if (!compact) {
      inputRef.current?.focus();
    }
  }, [compact]);

  const handleSubmit = useCallback(async () => {
    const text = input.trim();
    if (!text && attachments.length === 0) return;

    setStatus("loading");
    setResult(null);
    setError("");

    try {
      const parsed = await parseNaturalInput(text);
      setResult(parsed);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError("Gagal memproses. Coba lagi.");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }, [input, attachments]);

  const handleConfirm = useCallback(async () => {
    if (!result) return;

    try {
      if (result.note) {
        await onAddNote(result.note.title, result.note.content);
      }
      if (result.task) {
        await onAddTask(result.task.title, result.task.priority, result.task.due_date || undefined);
      }
      if (result.transaction) {
        await onAddTransaction(
          result.transaction.type,
          result.transaction.amount,
          result.transaction.category,
          result.transaction.description,
        );
      }

      // Reset
      setInput("");
      setResult(null);
      setStatus("idle");
      setAttachments([]);
      setError("");

      // Focus back
      inputRef.current?.focus();
    } catch {
      setStatus("error");
      setError("Gagal menyimpan. Coba lagi.");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }, [result, onAddNote, onAddTask, onAddTransaction]);

  const handleDismiss = useCallback(() => {
    setResult(null);
    setStatus("idle");
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (result) {
          handleConfirm();
        } else {
          handleSubmit();
        }
      }
      if (e.key === "Escape") {
        handleDismiss();
      }
    },
    [result, handleConfirm, handleSubmit, handleDismiss],
  );

  // File handlers
  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachments(prev => [...prev, { type: "image", name: file.name }]);
    }
    e.target.value = "";
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachments(prev => [...prev, { type: "file", name: file.name }]);
    }
    e.target.value = "";
  }, []);

  const handleAudioSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachments(prev => [...prev, { type: "audio", name: file.name }]);
    }
    e.target.value = "";
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Auto-submit after result is dismissed and new input is entered
  const canSubmit = (input.trim() || attachments.length > 0) && status !== "loading";

  const attachIcons = {
    image: <Image size={12} />,
    file: <Paperclip size={12} />,
    audio: <Mic size={12} />,
  };

  return (
    <div className={compact ? "" : "w-full max-w-2xl mx-auto"}>
      {/* Main input bar */}
      <div
        className={`relative transition-all ${
          compact
            ? ""
            : "backdrop-blur-sm"
        }`}
      >
        <div
          className={`flex items-center gap-2 rounded-2xl border bg-card/95 transition-all ${
            status === "loading"
              ? "border-amber-400 ring-2 ring-amber-400/20 shadow-lg shadow-amber-500/5"
              : status === "success" && result
                ? "border-emerald-400 ring-2 ring-emerald-400/20"
                : status === "error"
                  ? "border-destructive ring-2 ring-destructive/20"
                  : "border-border/60 hover:border-muted-foreground/30 hover:shadow-md focus-within:border-foreground/30 focus-within:ring-2 focus-within:ring-foreground/10 focus-within:shadow-lg"
          } ${compact ? "px-3 py-2 rounded-xl" : "px-5 py-4 shadow-sm"}`}
        >
          {/* Sparkle icon */}
          <Sparkles
            size={compact ? 16 : 20}
            className={`shrink-0 ${
              status === "loading"
                ? "text-amber-500 animate-pulse"
                : status === "success"
                  ? "text-emerald-500"
                  : "text-amber-500/50"
            }`}
          />

          {/* Input */}
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (result) setResult(null);
              if (status === "success" || status === "error") setStatus("idle");
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              compact
                ? "Ketik task, note, atau transaksi..."
                : "Ketik apa pun — tugas, catatan, pengeluaran... AI akan otomatis memprosesnya"
            }
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/30 disabled:opacity-50"
            style={{ fontSize: compact ? "14px" : "16px" }}
            disabled={status === "loading"}
            autoComplete="off"
          />

          {/* Attachment chips */}
          {attachments.length > 0 && (
            <div className="hidden shrink-0 items-center gap-1 sm:flex">
              {attachments.map((att, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                >
                  {attachIcons[att.type]}
                  {att.name.length > 10 ? att.name.slice(0, 10) + "…" : att.name}
                  <button onClick={() => removeAttachment(i)} className="ml-0.5 hover:text-foreground">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Status / Submit button */}
          {status === "loading" ? (
            <div className="flex items-center gap-2">
              <Loader2 size={compact ? 16 : 18} className="animate-spin text-muted-foreground" />
              <span className="hidden text-xs text-muted-foreground sm:inline">Memproses...</span>
            </div>
          ) : status === "success" && result ? (
            <CheckCircle2 size={compact ? 18 : 20} className="text-emerald-500" />
          ) : (
            <div className="flex items-center gap-1">
              {/* Attachment buttons */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAttachments(!showAttachments)}
                  className="rounded-lg p-1.5 text-muted-foreground/40 transition-colors hover:bg-accent hover:text-muted-foreground"
                  title="Attach file"
                >
                  <Paperclip size={compact ? 14 : 16} />
                </button>
                <AnimatePresence>
                  {showAttachments && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      className="absolute right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-xl"
                    >
                      <div className="p-1.5">
                        <button
                          onClick={() => { imageInputRef.current?.click(); setShowAttachments(false); }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent"
                        >
                          <Image size={14} className="text-violet-500" />
                          Image
                        </button>
                        <button
                          onClick={() => { fileInputRef.current?.click(); setShowAttachments(false); }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent"
                        >
                          <Paperclip size={14} className="text-blue-500" />
                          File
                        </button>
                        <button
                          onClick={() => { audioInputRef.current?.click(); setShowAttachments(false); }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent"
                        >
                          <Mic size={14} className="text-rose-500" />
                          Audio
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Submit button */}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`flex items-center justify-center rounded-xl transition-all ${
                  compact
                    ? "h-8 w-8"
                    : "h-10 w-10"
                } ${
                  canSubmit
                    ? "bg-foreground text-background shadow-md hover:opacity-90 active:scale-95"
                    : "bg-muted text-muted-foreground/40 cursor-not-allowed"
                }`}
              >
                {compact ? <ArrowRight size={14} /> : <Plus size={compact ? 16 : 20} />}
              </button>
            </div>
          )}
        </div>

        {/* Hidden file inputs */}
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
        <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioSelect} />

        {/* Quick hints below input (non-compact mode) */}
        {!compact && status === "idle" && !result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 flex flex-wrap items-center gap-2 px-1"
          >
            <span className="text-[11px] text-muted-foreground/40">Contoh:</span>
            <button
              onClick={() => setInput("pertemuan meeting dan pembuatan aplikasi tanggal 10 jul 2026, high")}
              className="rounded-full bg-muted/50 px-2.5 py-1 text-[11px] text-muted-foreground/50 transition-colors hover:bg-muted hover:text-muted-foreground"
            >
              📅 Meeting 10 Jul 2026, high
            </button>
            <button
              onClick={() => setInput("gaji bulan ini 15 juta")}
              className="rounded-full bg-muted/50 px-2.5 py-1 text-[11px] text-muted-foreground/50 transition-colors hover:bg-muted hover:text-muted-foreground"
            >
              💰 Gaji 15 juta
            </button>
            <button
              onClick={() => setInput("ide aplikasi absensi online")}
              className="rounded-full bg-muted/50 px-2.5 py-1 text-[11px] text-muted-foreground/50 transition-colors hover:bg-muted hover:text-muted-foreground"
            >
              💡 Ide aplikasi
            </button>
          </motion.div>
        )}

        {/* Error message */}
        <AnimatePresence>
          {status === "error" && error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mt-1.5 flex items-center gap-1.5 px-1 text-xs text-destructive"
            >
              <AlertCircle size={12} />
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Parsed results preview */}
      <AnimatePresence>
        {result && (
          <ParsedResultPreview
            result={result}
            onConfirm={handleConfirm}
            onDismiss={handleDismiss}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
