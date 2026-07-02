import { useState, useMemo } from "react";
import { Bell, AlertTriangle, Clock, CalendarCheck, X, ChevronDown } from "lucide-react";
import type { Task, LucideIcon } from "lucide-react";
import type { Task as TaskType } from "./data";

export function DueDateReminder({
  tasks,
  onTaskClick,
}: {
  tasks: TaskType[];
  onTaskClick?: () => void;
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);

  const groups = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const todayKey = now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const makeGroup = (
      id: string,
      label: string,
      icon: LucideIcon,
      color: string,
      ts: TaskType[]
    ) => (ts.length ? { id, label, icon, color, tasks: ts } : null);

    const overdue: TaskType[] = [],
      today: TaskType[] = [],
      tom: TaskType[] = [],
      week: TaskType[] = [];

    tasks.forEach((t) => {
      if (!t.due_date || t.status === "done" || dismissed.has(t.id)) return;
      const d = new Date(t.due_date + "T00:00:00");
      if (d < now) overdue.push(t);
      else if (d.toDateString() === todayKey) today.push(t);
      else if (d.toDateString() === tomorrow.toDateString()) tom.push(t);
      else if (d <= weekEnd) week.push(t);
    });

    return [
      makeGroup("overdue", "Overdue", AlertTriangle, "text-destructive", overdue),
      makeGroup("today", "Today", Clock, "text-amber-600", today),
      makeGroup("tomorrow", "Tomorrow", Clock, "text-orange-500", tom),
      makeGroup("week", "This Week", CalendarCheck, "text-blue-500", week),
    ].filter(Boolean) as {
      id: string;
      label: string;
      icon: LucideIcon;
      color: string;
      tasks: TaskType[];
    }[];
  }, [tasks, dismissed]);

  const total = groups.reduce((s, g) => s + g.tasks.length, 0);
  const display = expanded
    ? groups
    : groups.map((g) => ({ ...g, tasks: g.tasks.slice(0, 5) }));

  if (total === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="mb-2 flex items-center gap-2">
          <Bell size={16} className="text-emerald-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Reminders
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">All clear ✓</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-amber-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Reminders
          </h3>
        </div>
        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
          {total}
        </span>
      </div>
      <div className="divide-y divide-border">
        {display.map((g) => {
          const Icon = g.icon;
          return (
            <div key={g.id} className="px-5 py-3">
              <div className="mb-2 flex items-center gap-2">
                <Icon size={12} className={g.color} />
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${g.color}`}>
                  {g.label}
                </span>
                <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {g.tasks.length}
                </span>
              </div>
              {g.tasks.map((t) => {
                const diff = Math.round(
                  (new Date(t.due_date! + "T00:00:00").getTime() - Date.now()) /
                    86400000
                );
                return (
                  <button
                    key={t.id}
                    onClick={onTaskClick}
                    className="group flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        t.priority === "high"
                          ? "bg-destructive"
                          : t.priority === "medium"
                            ? "bg-amber-500"
                            : "bg-blue-500"
                      }`}
                    />
                    <span className="flex-1 truncate">{t.title}</span>
                    <span
                      className={`shrink-0 text-[11px] tabular-nums ${
                        diff < 0
                          ? "font-medium text-destructive"
                          : diff === 0
                            ? "font-semibold text-amber-600"
                            : "text-muted-foreground"
                      }`}
                    >
                      {diff < 0
                        ? `${Math.abs(diff)}d overdue`
                        : diff === 0
                          ? "Today!"
                          : diff === 1
                            ? "Tomorrow"
                            : `${diff}d`}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDismissed((p) => new Set(p).add(t.id));
                      }}
                      className="p-0.5 text-muted-foreground/40 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                    >
                      <X size={12} />
                    </button>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
      {!expanded && total > 5 && (
        <button
          onClick={() => setExpanded(true)}
          className="flex w-full items-center justify-center gap-1 border-t border-border py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDown size={14} /> Show all ({total})
        </button>
      )}
      {dismissed.size > 0 && (
        <button
          onClick={() => setDismissed(new Set())}
          className="flex w-full items-center justify-center border-t border-border py-2 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          ↻ Show {dismissed.size} dismissed
        </button>
      )}
    </div>
  );
}
