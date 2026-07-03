import { useState, useEffect, useRef, useMemo } from "react";
import { Search, X, FileText, CheckSquare, Wallet, Target, Hash, Sparkles } from "lucide-react";
import type { Note, Task, Transaction, Habit, SearchResult, ActiveTab } from "./data";

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: ActiveTab) => void;
  notes: Note[];
  tasks: Task[];
  transactions: Transaction[];
  habits?: Habit[];
}

interface GroupedResult {
  module: ActiveTab;
  moduleLabel: string;
  icon: typeof FileText;
  color: string;
  bgClass: string;
  results: SearchResult[];
}

const MODULE_CONFIG: Record<string, { label: string; icon: typeof FileText; color: string; bgClass: string }> = {
  notes: { label: "Notes", icon: FileText, color: "text-blue-500", bgClass: "bg-blue-50 dark:bg-blue-500/10" },
  tasks: { label: "Tasks", icon: CheckSquare, color: "text-amber-500", bgClass: "bg-amber-50 dark:bg-amber-500/10" },
  finance: { label: "Finance", icon: Wallet, color: "text-emerald-500", bgClass: "bg-emerald-50 dark:bg-emerald-500/10" },
  habits: { label: "Habits", icon: Target, color: "text-rose-500", bgClass: "bg-rose-50 dark:bg-rose-500/10" },
};

export function GlobalSearch({
  isOpen,
  onClose,
  onNavigate,
  notes,
  tasks,
  transactions,
  habits,
}: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Parse query for module filter: "notes: something" or "tasks:", "habits:", "finance:"
  const parsedQuery = useMemo(() => {
    const modulePrefixMatch = query.match(/^(notes|tasks|finance|habits):\s*(.*)$/i);
    if (modulePrefixMatch) {
      return { module: modulePrefixMatch[1].toLowerCase(), text: modulePrefixMatch[2], hasModulePrefix: true };
    }
    return { module: null, text: query, hasModulePrefix: false };
  }, [query]);

  const groupedResults = useMemo(() => {
    if (!parsedQuery.text.trim()) return [];
    const q = parsedQuery.text.toLowerCase();

    const groups: GroupedResult[] = [];
    const shouldSearch = (mod: string) => !parsedQuery.module || parsedQuery.module === mod;

    // Notes
    if (shouldSearch("notes")) {
      const noteResults: SearchResult[] = [];
      notes.forEach((n) => {
        if (n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.tags?.some((t) => t.toLowerCase().includes(q))) {
          const idx = n.content.toLowerCase().indexOf(q);
          let subtitle = "";
          if (idx >= 0) {
            const start = Math.max(0, idx - 30);
            const end = Math.min(n.content.length, idx + q.length + 30);
            subtitle = (start > 0 ? "..." : "") + n.content.slice(start, end) + (end < n.content.length ? "..." : "");
          } else {
            subtitle = n.content.slice(0, 60);
          }
          noteResults.push({
            id: "note-" + n.id, module: "notes", moduleLabel: "Notes",
            icon: FileText, title: n.title, subtitle: subtitle || "No content",
            color: "text-blue-500", _matchField: n.title.toLowerCase().includes(q) ? "title" : "content",
          });
        }
      });
      if (noteResults.length > 0) {
        groups.push({ module: "notes", moduleLabel: "Notes", icon: FileText, color: "text-blue-500", bgClass: "bg-blue-50 dark:bg-blue-500/10", results: noteResults });
      }
    }

    // Tasks
    if (shouldSearch("tasks")) {
      const taskResults: SearchResult[] = [];
      tasks.forEach((t) => {
        if (t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q) ||
            t.tags?.some((tag) => tag.toLowerCase().includes(q)) || t.subtasks?.some((st) => st.title.toLowerCase().includes(q)) ||
            t.status?.toLowerCase().includes(q) || t.priority?.toLowerCase().includes(q)) {
          let subtitle = `[${t.status.replace("_", " ")}] ${t.priority}`;
          if (t.due_date) subtitle += ` • Due ${new Date(t.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
          if (t.description) {
            const idx = t.description.toLowerCase().indexOf(q);
            if (idx >= 0) {
              const start = Math.max(0, idx - 20);
              const end = Math.min(t.description.length, idx + q.length + 20);
              subtitle = (start > 0 ? "..." : "") + t.description.slice(start, end) + (end < t.description.length ? "..." : "");
            }
          }
          if (t.subtasks?.some((st) => st.title.toLowerCase().includes(q))) {
            const matched = t.subtasks.find((st) => st.title.toLowerCase().includes(q));
            subtitle = `☑ ${matched?.title}`;
          }
          taskResults.push({
            id: "task-" + t.id, module: "tasks", moduleLabel: "Tasks", icon: CheckSquare,
            title: t.title, subtitle,
            color: t.priority === "high" ? "text-destructive" : t.priority === "medium" ? "text-amber-500" : "text-blue-500",
            _matchField: t.tags?.some((tag) => tag.toLowerCase().includes(q)) ? "tags" : "title",
          });
        }
      });
      if (taskResults.length > 0) {
        groups.push({ module: "tasks", moduleLabel: "Tasks", icon: CheckSquare, color: "text-amber-500", bgClass: "bg-amber-50 dark:bg-amber-500/10", results: taskResults });
      }
    }

    // Finance
    if (shouldSearch("finance")) {
      const financeResults: SearchResult[] = [];
      transactions.forEach((tx) => {
        if (tx.category.toLowerCase().includes(q) || tx.description?.toLowerCase().includes(q) ||
            tx.transaction_date?.includes(q) || String(tx.amount).includes(q)) {
          const idx = tx.description?.toLowerCase().indexOf(q);
          let subtitle = `Rp ${Number(tx.amount).toLocaleString("id-ID")} • ${tx.transaction_date}`;
          if (idx !== undefined && idx >= 0 && tx.description) {
            const start = Math.max(0, idx - 20);
            const end = Math.min(tx.description.length, idx + q.length + 20);
            subtitle = (start > 0 ? "..." : "") + tx.description.slice(start, end) + (end < tx.description.length ? "..." : "") + ` • Rp ${Number(tx.amount).toLocaleString("id-ID")}`;
          }
          financeResults.push({
            id: "finance-" + tx.id, module: "finance", moduleLabel: "Finance", icon: Wallet,
            title: tx.category, subtitle,
            color: tx.type === "income" ? "text-emerald-500" : "text-destructive",
          });
        }
      });
      if (financeResults.length > 0) {
        groups.push({ module: "finance", moduleLabel: "Finance", icon: Wallet, color: "text-emerald-500", bgClass: "bg-emerald-50 dark:bg-emerald-500/10", results: financeResults });
      }
    }

    // Habits
    if (shouldSearch("habits") && habits) {
      const habitResults: SearchResult[] = [];
      habits.forEach((h) => {
        if (h.name.toLowerCase().includes(q)) {
          const doneToday = h.logs.some((l) => l.date === new Date().toISOString().split("T")[0] && l.done);
          habitResults.push({
            id: "habit-" + h.id, module: "habits", moduleLabel: "Habits", icon: Target,
            title: h.name,
            subtitle: `${h.icon} • ${h.streak} day streak • ${doneToday ? "✅ Done today" : "⭕ Not done today"}`,
            color: "text-rose-500",
          });
        }
      });
      if (habitResults.length > 0) {
        groups.push({ module: "habits", moduleLabel: "Habits", icon: Target, color: "text-rose-500", bgClass: "bg-rose-50 dark:bg-rose-500/10", results: habitResults });
      }
    }

    return groups;
  }, [parsedQuery, notes, tasks, transactions, habits]);

  const totalResults = useMemo(
    () => groupedResults.reduce((acc, g) => acc + g.results.length, 0),
    [groupedResults]
  );

  useEffect(() => { setSelectedIndex(0); }, [totalResults]);

  const getResultAtFlatIndex = (idx: number): SearchResult | null => {
    let count = 0;
    for (const group of groupedResults) {
      for (const result of group.results) {
        if (count === idx) return result;
        count++;
      }
    }
    return null;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % Math.max(totalResults, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + totalResults) % Math.max(totalResults, 1));
    } else if (e.key === "Enter") {
      const result = getResultAtFlatIndex(selectedIndex);
      if (result) { onNavigate(result.module); onClose(); }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const modules = ["notes", "tasks", "finance", "habits"];
      const current = parsedQuery.hasModulePrefix ? parsedQuery.module : null;
      const currentIdx = current ? modules.indexOf(current) : -1;
      const nextIdx = (currentIdx + 1) % modules.length;
      setQuery(`${modules[nextIdx]}: `);
      setSelectedIndex(0);
    }
  };

  if (!isOpen) return null;

  const hasText = parsedQuery.text.trim().length > 0;
  const showNoResults = hasText && totalResults === 0;
  const showEmptyState = !hasText && !parsedQuery.hasModulePrefix;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
        <div className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <Search size={18} className="shrink-0 text-muted-foreground/60" />
            <input
              ref={inputRef} type="text" value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
              onKeyDown={handleKeyDown}
              placeholder='Search everything... (Tab to filter: notes: tasks: finance: habits:)'
              className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/40"
              autoComplete="off"
            />
            {query && (
              <button onClick={() => setQuery("")} className="rounded p-0.5 text-muted-foreground/60 hover:text-foreground">
                <X size={16} />
              </button>
            )}
          </div>

          {/* Module filter chips */}
          {hasText && !parsedQuery.hasModulePrefix && (
            <div className="flex items-center gap-1.5 border-b border-border px-4 py-2">
              <span className="text-[10px] text-muted-foreground/60">Filter:</span>
              {["notes", "tasks", "finance", "habits"].map((mod) => {
                const config = MODULE_CONFIG[mod];
                const count = groupedResults.find((g) => g.module === mod)?.results.length;
                return (
                  <button key={mod} onClick={() => setQuery(`${mod}: ${parsedQuery.text}`)}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                      parsedQuery.module === mod ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}>
                    <config.icon size={10} />
                    {config.label}
                    {count !== undefined && count > 0 && <span className="ml-0.5 opacity-70">{count}</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* Module filter indicator */}
          {parsedQuery.hasModulePrefix && (
            <div className="flex items-center gap-2 border-b border-border px-4 py-2">
              <span className="text-[10px] text-muted-foreground/60">Searching in:</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-medium text-foreground">
                {(() => { const Icon = MODULE_CONFIG[parsedQuery.module!].icon; return <Icon size={10} />; })()}
                {MODULE_CONFIG[parsedQuery.module!].label}
              </span>
              <button onClick={() => setQuery(parsedQuery.text)} className="text-[10px] text-muted-foreground/60 hover:text-foreground">
                Clear filter
              </button>
            </div>
          )}

          {/* Results */}
          <div className="max-h-[420px] overflow-y-auto p-2">
            {showEmptyState && (
              <div className="py-10 text-center text-sm text-muted-foreground/60">
                <Search size={24} className="mx-auto mb-2 text-muted-foreground/20" />
                <p>Search across notes, tasks, transactions, and habits</p>
                <p className="mt-1 text-xs text-muted-foreground/40">Press Tab to filter by module · Arrow keys to navigate · Enter to open</p>
              </div>
            )}

            {showNoResults && (
              <div className="py-10 text-center text-sm text-muted-foreground/60">
                <p>No results found for {`“${parsedQuery.text}”`}</p>
                <p className="mt-1 text-xs text-muted-foreground/40">Try a different search term</p>
              </div>
            )}

            {groupedResults.map((group) => {
              let groupStartIndex = 0;
              for (const g of groupedResults) {
                if (g.module === group.module) break;
                groupStartIndex += g.results.length;
              }
              const Icon = group.icon;

              return (
                <div key={group.module} className="mb-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5">
                    <Icon size={12} className={group.color} />
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${group.color}`}>{group.moduleLabel}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground/40">{group.results.length} result{group.results.length !== 1 ? "s" : ""}</span>
                  </div>

                  {group.results.map((r, ri) => {
                    const flatIdx = groupStartIndex + ri;
                    const ResultIcon = r.icon;
                    return (
                      <button key={r.id} onClick={() => { onNavigate(r.module); onClose(); }}
                        onMouseEnter={() => setSelectedIndex(flatIdx)}
                        className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                          flatIdx === selectedIndex ? "bg-accent" : "hover:bg-accent/50"
                        }`}>
                        <div className={`mt-0.5 rounded-md ${group.bgClass} p-1.5 ${group.color}`}>
                          <ResultIcon size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{r.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{r.subtitle}</p>
                        </div>
                        <span className="shrink-0 self-center rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {r._matchField === "tags" ? (
                            <span className="flex items-center gap-1"><Hash size={9} /> Tag</span>
                          ) : r.moduleLabel === "Habits" ? (
                            <span className="flex items-center gap-1"><Sparkles size={9} /> Habit</span>
                          ) : (
                            r.moduleLabel
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
