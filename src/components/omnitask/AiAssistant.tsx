import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Lightbulb,
  Wand2,
  ArrowRight,
  Loader2,
  CheckCircle2,
  X,
  FileText,
  CheckSquare,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  suggestTasksFromNotes,
  suggestCategory,
  expandNoteContent,
} from "@/lib/gemini";
import type { Note, Task, Transaction } from "./data";

interface AiAssistantProps {
  notes: Note[];
  tasks: Task[];
  transactions: Transaction[];
  onAddTask: (title: string, priority: "low" | "medium" | "high") => Promise<void>;
  activeNote?: Note | null;
}

export function AiAssistant({ notes, tasks, transactions, onAddTask, activeNote }: AiAssistantProps) {
  const [mode, setMode] = useState<"suggestions" | "categorize" | "write">("suggestions");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<{ title: string; priority: "low" | "medium" | "high"; reason: string }[]>([]);
  const [addedTasks, setAddedTasks] = useState<Set<string>>(new Set());
  const [expandedContent, setExpandedContent] = useState<string | null>(null);
  const [showAssistant, setShowAssistant] = useState(false);

  const uncategorizedTransactions = useMemo(() => {
    return transactions.filter((t) => t.category === "Other" || !t.category);
  }, [transactions]);

  const handleGetSuggestions = async () => {
    setLoading(true);
    const result = await suggestTasksFromNotes(notes);
    setSuggestions(result);
    setLoading(false);
  };

  const handleAddSuggestion = async (title: string, priority: "low" | "medium" | "high") => {
    await onAddTask(title, priority);
    setAddedTasks((prev) => new Set(prev).add(title));
  };

  const handleExpandNote = async () => {
    if (!activeNote) return;
    setLoading(true);
    const result = await expandNoteContent(activeNote.title, activeNote.content);
    setExpandedContent(result);
    setLoading(false);
  };

  return (
    <>
      {/* FAB to open AI Assistant */}
      <button
        onClick={() => setShowAssistant(true)}
        className="fixed bottom-6 right-6 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-all hover:scale-105 hover:opacity-90"
        title="AI Assistant"
      >
        <Sparkles size={20} />
      </button>

      {/* Panel */}
      <AnimatePresence>
        {showAssistant && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm"
              onClick={() => setShowAssistant(false)}
            />
            <motion.div
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 right-0 z-50 w-80 border-l border-border bg-card shadow-xl"
            >
              <div className="flex h-14 items-center justify-between border-b border-border px-5">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-500" />
                  <span className="text-sm font-semibold">AI Assistant</span>
                </div>
                <button
                  onClick={() => setShowAssistant(false)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-accent"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Mode tabs */}
              <div className="flex border-b border-border">
                {[
                  { id: "suggestions" as const, label: "Suggest", icon: Lightbulb },
                  { id: "categorize" as const, label: "Categorize", icon: Wallet },
                  { id: "write" as const, label: "Write", icon: Wand2 },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMode(m.id)}
                      className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
                        mode === m.id
                          ? "border-b-2 border-foreground text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon size={14} />
                      {m.label}
                    </button>
                  );
                })}
              </div>

              <div className="overflow-y-auto p-4" style={{ height: "calc(100% - 108px)" }}>
                {/* Suggestions Mode */}
                {mode === "suggestions" && (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-500/10">
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        AI analyzes your notes and suggests tasks you might want to create.
                      </p>
                    </div>

                    <Button
                      onClick={handleGetSuggestions}
                      disabled={loading || notes.length === 0}
                      size="sm"
                      className="w-full gap-1.5"
                    >
                      {loading ? (
                        <><Loader2 size={14} className="animate-spin" /> Analyzing...</>
                      ) : (
                        <><Lightbulb size={14} /> Generate Suggestions</>
                      )}
                    </Button>

                    {suggestions.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Suggested tasks ({suggestions.length})
                        </p>
                        {suggestions.map((s, i) => (
                          <div
                            key={i}
                            className="rounded-lg border border-border p-3 transition-colors hover:bg-accent/50"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{s.title}</p>
                                <div className="mt-1 flex items-center gap-2">
                                  <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                                    s.priority === "high"
                                      ? "bg-destructive/10 text-destructive"
                                      : s.priority === "medium"
                                        ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                                        : "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                                  }`}>
                                    {s.priority}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">{s.reason}</p>
                              </div>
                              <button
                                onClick={() => handleAddSuggestion(s.title, s.priority)}
                                disabled={addedTasks.has(s.title)}
                                className={`shrink-0 rounded-md p-1.5 ${
                                  addedTasks.has(s.title)
                                    ? "text-emerald-500"
                                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                }`}
                                title={addedTasks.has(s.title) ? "Added!" : "Add task"}
                              >
                                {addedTasks.has(s.title) ? (
                                  <CheckCircle2 size={16} />
                                ) : (
                                  <ArrowRight size={16} />
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {notes.length === 0 && (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        <FileText size={24} className="mx-auto mb-2 text-muted-foreground/30" />
                        Create some notes first to get AI suggestions
                      </div>
                    )}
                  </div>
                )}

                {/* Categorize Mode */}
                {mode === "categorize" && (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-500/10">
                      <p className="text-xs text-blue-700 dark:text-blue-400">
                        Auto-categorize transactions based on their description.
                      </p>
                    </div>

                    {uncategorizedTransactions.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-400" />
                        All transactions are categorized!
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          {uncategorizedTransactions.length} uncategorized
                        </p>
                        {uncategorizedTransactions.slice(0, 10).map((t) => {
                          const predicted = suggestCategory(t.description);
                          return (
                            <div
                              key={t.id}
                              className="flex items-center gap-2 rounded-lg border border-border p-2.5 text-sm"
                            >
                              <Wallet size={14} className="shrink-0 text-muted-foreground" />
                              <span className="flex-1 truncate">{t.description || t.category}</span>
                              <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                → {predicted}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Write Mode */}
                {mode === "write" && (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-violet-50 p-3 dark:bg-violet-500/10">
                      <p className="text-xs text-violet-700 dark:text-violet-400">
                        Expand or improve your note content with AI.
                      </p>
                    </div>

                    {activeNote ? (
                      <div className="space-y-3">
                        <div className="rounded-lg border border-border p-3">
                          <p className="text-xs text-muted-foreground">Selected note:</p>
                          <p className="mt-1 text-sm font-medium">{activeNote.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                            {activeNote.content}
                          </p>
                        </div>
                        <Button
                          onClick={handleExpandNote}
                          disabled={loading}
                          size="sm"
                          className="w-full gap-1.5"
                        >
                          {loading ? (
                            <><Loader2 size={14} className="animate-spin" /> Expanding...</>
                          ) : (
                            <><Wand2 size={14} /> Expand Note</>
                          )}
                        </Button>
                        {expandedContent && (
                          <div className="rounded-lg border border-border bg-muted/30 p-3">
                            <p className="mb-2 text-xs font-medium text-muted-foreground">Expanded</p>
                            <p className="text-sm whitespace-pre-wrap">{expandedContent}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        <FileText size={24} className="mx-auto mb-2 text-muted-foreground/30" />
                        Open a note to use the writing assistant
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
