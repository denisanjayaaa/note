import { useState, useEffect, useRef, useMemo } from "react";
import { Search, X, FileText, CheckSquare, Wallet } from "lucide-react";
import type { Note, Task, Transaction, SearchResult, ActiveTab } from "./data";

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: ActiveTab) => void;
  notes: Note[];
  tasks: Task[];
  transactions: Transaction[];
}

export function GlobalSearch({
  isOpen,
  onClose,
  onNavigate,
  notes,
  tasks,
  transactions,
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

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const match = (...fields: string[]) =>
      fields.some((f) => f.toLowerCase().includes(q));

    const r: SearchResult[] = [];

    notes.forEach((n) => {
      if (match(n.title, n.content))
        r.push({
          id: n.id,
          module: "notes",
          moduleLabel: "Notes",
          icon: FileText,
          title: n.title,
          subtitle: n.content.slice(0, 60),
          color: "text-blue-500",
        });
    });

    tasks.forEach((t) => {
      if (match(t.title))
        r.push({
          id: t.id,
          module: "tasks",
          moduleLabel: "Tasks",
          icon: CheckSquare,
          title: t.title,
          subtitle: t.status.replace("_", " "),
          color:
            t.priority === "high"
              ? "text-destructive"
              : t.priority === "medium"
                ? "text-amber-500"
                : "text-blue-500",
        });
    });

    transactions.forEach((tx) => {
      if (match(tx.category, tx.description))
        r.push({
          id: tx.id,
          module: "finance",
          moduleLabel: "Finance",
          icon: Wallet,
          title: tx.category,
          subtitle: `Rp ${Number(tx.amount).toLocaleString("id-ID")}`,
          color:
            tx.type === "income" ? "text-emerald-500" : "text-destructive",
        });
    });

    return r.slice(0, 30);
  }, [query, notes, tasks, transactions]);

  useEffect(() => setSelectedIndex(0), [results.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % Math.max(results.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(
        (i) => (i - 1 + results.length) % Math.max(results.length, 1)
      );
    } else if (e.key === "Enter" && results[selectedIndex]) {
      onNavigate(results[selectedIndex].module);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
        <div
          className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <Search
              size={18}
              className="shrink-0 text-muted-foreground/60"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search notes, tasks, transactions..."
              className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/40"
              autoComplete="off"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="rounded p-0.5 text-muted-foreground/60 hover:text-foreground"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-[360px] overflow-y-auto p-2">
            {!query.trim() && (
              <div className="py-10 text-center text-sm text-muted-foreground/60">
                Start typing to search
              </div>
            )}
            {query.trim() && results.length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground/60">
                No results found
              </div>
            )}
            {results.map((r, i) => {
              const Icon = r.icon;
              return (
                <button
                  key={`${r.module}-${r.id}`}
                  onClick={() => {
                    onNavigate(r.module);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    i === selectedIndex
                      ? "bg-accent"
                      : "hover:bg-accent/50"
                  }`}
                >
                  <div className={`mt-0.5 rounded-md bg-muted p-1.5 ${r.color}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.subtitle}
                    </p>
                  </div>
                  <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    {r.moduleLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
