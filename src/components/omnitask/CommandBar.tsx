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
  Trash2,
  Edit3,
  Undo2,
} from "lucide-react";
import { parseNaturalInput, type ParsedIntent, type ParsedNote, type ParsedTask, type ParsedTransaction } from "@/lib/deepseek";
import type { Task } from "./data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Types ───

interface CommandBarProps {
  onAddTask: (title: string, priority: Task["priority"], dueDate?: string) => Promise<void>;
  onAddNote: (title: string, content: string) => Promise<void>;
  onAddTransaction: (type: "income" | "expense", amount: number, category: string, description: string) => Promise<void>;
  compact?: boolean;
}

type Status = "idle" | "loading" | "success" | "error";

type Attachment = {
  type: "image" | "file" | "audio";
  name: string;
  data?: string;
};

// ─── Priority Badge ───

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  low: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
};

function PrioritySelect({ value, onChange }: { value: string; onChange: (v: "high" | "medium" | "low") => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as "high" | "medium" | "low")}
      className="rounded-md border border-input bg-background px-2 py-1 text-[11px] font-semibold uppercase tracking-wider shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
    >
      <option value="high">High</option>
      <option value="medium">Medium</option>
      <option value="low">Low</option>
    </select>
  );
}

// ─── Editable Note Card ───

function EditableNoteCard({
  note,
  index,
  onChange,
  onDelete,
}: {
  note: ParsedNote;
  index: number;
  onChange: (i: number, n: ParsedNote) => void;
  onDelete: (i: number) => void;
}) {
  return (
    <div className="group relative rounded-lg border border-border/50 bg-amber-50/30 p-3 dark:bg-amber-500/5">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <FileText size={13} className="text-amber-500" />
          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">Note</span>
        </div>
        <button
          onClick={() => onDelete(index)}
          className="rounded p-1 text-muted-foreground/40 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
          title="Hapus note"
        >
          <Trash2 size={12} />
        </button>
      </div>
      <div className="space-y-2">
        <Input
          value={note.title}
          onChange={(e) => onChange(index, { ...note, title: e.target.value })}
          placeholder="Judul note..."
          className="h-7 border-0 bg-transparent px-0 text-sm font-medium shadow-none focus-visible:ring-0"
        />
        <textarea
          value={note.content}
          onChange={(e) => onChange(index, { ...note, content: e.target.value })}
          placeholder="Isi catatan..."
          rows={2}
          className="w-full resize-none border-0 bg-transparent px-0 text-xs text-muted-foreground placeholder:text-muted-foreground/40 focus:outline-none"
        />
      </div>
    </div>
  );
}

// ─── Editable Task Card ───

function EditableTaskCard({
  task,
  index,
  onChange,
  onDelete,
}: {
  task: ParsedTask;
  index: number;
  onChange: (i: number, t: ParsedTask) => void;
  onDelete: (i: number) => void;
}) {
  return (
    <div className="group relative rounded-lg border border-border/50 bg-sky-50/30 p-3 dark:bg-sky-500/5">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ListChecks size={13} className="text-sky-500" />
          <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-400">Task</span>
        </div>
        <button
          onClick={() => onDelete(index)}
          className="rounded p-1 text-muted-foreground/40 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
          title="Hapus task"
        >
          <Trash2 size={12} />
        </button>
      </div>
      <div className="space-y-2">
        <Input
          value={task.title}
          onChange={(e) => onChange(index, { ...task, title: e.target.value })}
          placeholder="Judul task..."
          className="h-7 border-0 bg-transparent px-0 text-sm font-medium shadow-none focus-visible:ring-0"
        />
        <div className="flex flex-wrap items-center gap-2">
          <PrioritySelect
            value={task.priority}
            onChange={(p) => onChange(index, { ...task, priority: p })}
          />
          <input
            type="date"
            value={task.due_date || ""}
            onChange={(e) => onChange(index, { ...task, due_date: e.target.value || null })}
            className="rounded-md border border-input bg-background px-2 py-1 text-[11px] shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
          />
          <select
            value={task.status}
            onChange={(e) => onChange(index, { ...task, status: e.target.value as "todo" | "in_progress" })}
            className="rounded-md border border-input bg-background px-2 py-1 text-[11px] shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// ─── Editable Transaction Card ───

function EditableTransactionCard({
  tx,
  index,
  onChange,
  onDelete,
}: {
  tx: ParsedTransaction;
  index: number;
  onChange: (i: number, t: ParsedTransaction) => void;
  onDelete: (i: number) => void;
}) {
  return (
    <div className="group relative rounded-lg border border-border/50 bg-emerald-50/30 p-3 dark:bg-emerald-500/5">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Wallet size={13} className="text-emerald-500" />
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            {tx.type === "income" ? "Income" : "Expense"}
          </span>
        </div>
        <button
          onClick={() => onDelete(index)}
          className="rounded p-1 text-muted-foreground/40 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
          title="Hapus transaksi"
        >
          <Trash2 size={12} />
        </button>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <select
            value={tx.type}
            onChange={(e) => onChange(index, { ...tx, type: e.target.value as "income" | "expense" })}
            className="rounded-md border border-input bg-background px-2 py-1 text-[11px] font-medium shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
          >
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <div className="flex items-center rounded-md border border-input bg-background shadow-xs focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]">
            <span className="flex-none px-2 text-[11px] font-medium text-muted-foreground">Rp</span>
            <input
              type="number"
              value={tx.amount}
              onChange={(e) => onChange(index, { ...tx, amount: parseInt(e.target.value) || 0 })}
              className="min-w-0 flex-1 border-0 bg-transparent py-1 pr-2 text-[11px] font-medium outline-none"
              min={0}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={tx.category}
            onChange={(e) => onChange(index, { ...tx, category: e.target.value })}
            placeholder="Kategori (e.g. Food, Salary)"
            className="h-7 text-[11px]"
          />
        </div>
        <Input
          value={tx.description}
          onChange={(e) => onChange(index, { ...tx, description: e.target.value })}
          placeholder="Deskripsi..."
          className="h-7 text-[11px]"
        />
      </div>
    </div>
  );
}

// ─── Parsed Result Preview (Editable) ───

function ParsedResultPreview({
  initialResult,
  onConfirm,
  onDismiss,
}: {
  initialResult: ParsedIntent;
  onConfirm: (notes: ParsedNote[], tasks: ParsedTask[], transactions: ParsedTransaction[]) => void;
  onDismiss: () => void;
}) {
  // Store editable items in arrays — items can be deleted
  const [notes, setNotes] = useState<ParsedNote[]>(
    initialResult.note ? [initialResult.note] : []
  );
  const [tasks, setTasks] = useState<ParsedTask[]>(
    initialResult.task ? [initialResult.task] : []
  );
  const [transactions, setTransactions] = useState<ParsedTransaction[]>(
    initialResult.transaction ? [initialResult.transaction] : []
  );

  const handleNoteChange = useCallback((index: number, updated: ParsedNote) => {
    setNotes((prev) => prev.map((n, i) => (i === index ? updated : n)));
  }, []);

  const handleTaskChange = useCallback((index: number, updated: ParsedTask) => {
    setTasks((prev) => prev.map((t, i) => (i === index ? updated : t)));
  }, []);

  const handleTransactionChange = useCallback((index: number, updated: ParsedTransaction) => {
    setTransactions((prev) => prev.map((t, i) => (i === index ? updated : t)));
  }, []);

  const handleDeleteNote = useCallback((index: number) => {
    setNotes((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleDeleteTask = useCallback((index: number) => {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleDeleteTransaction = useCallback((index: number) => {
    setTransactions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(notes, tasks, transactions);
  }, [notes, tasks, transactions, onConfirm]);

  const handleAddNote = useCallback(() => {
    setNotes((prev) => [...prev, { title: "", content: "" }]);
  }, []);

  const handleAddTask = useCallback(() => {
    setTasks((prev) => [...prev, { title: "", priority: "medium", due_date: null, status: "todo" }]);
  }, []);

  const handleAddTransaction = useCallback(() => {
    setTransactions((prev) => [...prev, { type: "expense", amount: 0, category: "Other", description: "" }]);
  }, []);

  const totalItems = notes.length + tasks.length + transactions.length;

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
          <span className="text-xs font-semibold">AI Analysis — Edit before creating</span>
          {totalItems > 0 && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {totalItems} item{totalItems > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <button onClick={onDismiss} className="rounded p-1 text-muted-foreground hover:bg-accent">
          <X size={14} />
        </button>
      </div>

      {/* Summary */}
      <div className="border-b border-border/50 bg-muted/20 px-4 py-2">
        <p className="text-xs text-muted-foreground">{initialResult.summary}</p>
      </div>

      {/* + Add toolbar */}
      <div className="flex items-center gap-1.5 border-b border-border/30 px-3 py-2">
        <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider mr-1">Add</span>
        <button
          onClick={handleAddNote}
          className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 transition-all hover:bg-amber-100 active:scale-95 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20"
        >
          <Plus size={11} />
          Note
        </button>
        <button
          onClick={handleAddTask}
          className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-1 text-[11px] font-medium text-sky-700 transition-all hover:bg-sky-100 active:scale-95 dark:bg-sky-500/10 dark:text-sky-400 dark:hover:bg-sky-500/20"
        >
          <Plus size={11} />
          Task
        </button>
        <button
          onClick={handleAddTransaction}
          className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 transition-all hover:bg-emerald-100 active:scale-95 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
        >
          <Plus size={11} />
          Expense
        </button>
      </div>

      {/* Editable Items */}
      <div className="space-y-2 p-3">
        {/* Notes */}
        <AnimatePresence>
          {notes.map((note, i) => (
            <motion.div
              key={`note-${i}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.15 }}
            >
              <EditableNoteCard note={note} index={i} onChange={handleNoteChange} onDelete={handleDeleteNote} />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Tasks */}
        <AnimatePresence>
          {tasks.map((task, i) => (
            <motion.div
              key={`task-${i}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.15 }}
            >
              <EditableTaskCard task={task} index={i} onChange={handleTaskChange} onDelete={handleDeleteTask} />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Transactions */}
        <AnimatePresence>
          {transactions.map((tx, i) => (
            <motion.div
              key={`tx-${i}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.15 }}
            >
              <EditableTransactionCard tx={tx} index={i} onChange={handleTransactionChange} onDelete={handleDeleteTransaction} />
            </motion.div>
          ))}
        </AnimatePresence>

        {totalItems === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-2 py-6 text-center"
          >
            <Undo2 size={20} className="text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground/50">Semua item telah dihapus. Tutup atau ketik ulang.</p>
          </motion.div>
        )}
      </div>

      {/* Confirm button */}
      {totalItems > 0 && (
        <div className="border-t border-border px-3 py-2.5">
          <button
            onClick={handleConfirm}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2 text-xs font-semibold text-background transition-all hover:opacity-90 active:scale-[0.98]"
          >
            <CheckCircle2 size={14} />
            Confirm & Create {totalItems} Item{totalItems > 1 ? "s" : ""}
          </button>
        </div>
      )}
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

  const handleConfirm = useCallback(async (
    confirmNotes: ParsedNote[],
    confirmTasks: ParsedTask[],
    confirmTransactions: ParsedTransaction[],
  ) => {
    try {
      for (const note of confirmNotes) {
        await onAddNote(note.title, note.content);
      }
      for (const task of confirmTasks) {
        await onAddTask(task.title, task.priority, task.due_date || undefined);
      }
      for (const tx of confirmTransactions) {
        await onAddTransaction(tx.type, tx.amount, tx.category, tx.description);
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
  }, [onAddNote, onAddTask, onAddTransaction]);

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
          // Don't submit with Enter when preview is showing — user should click confirm
        } else {
          handleSubmit();
        }
      }
      if (e.key === "Escape") {
        handleDismiss();
      }
    },
    [result, handleSubmit, handleDismiss],
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

  const canSubmit = (input.trim() || attachments.length > 0) && status !== "loading";

  const attachIcons = {
    image: <Image size={12} />,
    file: <Paperclip size={12} />,
    audio: <Mic size={12} />,
  };

  return (
    <div className={compact ? "" : "w-full max-w-2xl mx-auto"}>
      {/* Main input bar */}
      <div className={`relative transition-all ${compact ? "" : "backdrop-blur-sm"}`}>
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

              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`flex items-center justify-center rounded-xl transition-all ${
                  compact ? "h-8 w-8" : "h-10 w-10"
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

        {/* Quick hints below input */}
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

      {/* Parsed results preview — now editable */}
      <AnimatePresence>
        {result && (
          <ParsedResultPreview
            initialResult={result}
            onConfirm={handleConfirm}
            onDismiss={handleDismiss}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
