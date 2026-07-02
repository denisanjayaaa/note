import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Task } from "./data";

interface CalendarViewProps {
  tasks: Task[];
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarView({ tasks }: CalendarViewProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(null);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();

  const grid: (number | null)[][] = [];
  let week: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) week.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      grid.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    grid.push(week);
  }

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks
      .filter((t) => t.due_date)
      .forEach((t) => {
        const existing = map.get(t.due_date!) || [];
        existing.push(t);
        map.set(t.due_date!, existing);
      });
    return map;
  }, [tasks]);

  const formatDate = (d: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const isToday = (d: number) => {
    const date = new Date(year, month, d);
    return date.toDateString() === today.toDateString();
  };

  const prevMonth = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
    setSelected(null);
  };

  const nextMonth = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
    setSelected(null);
  };

  const selectedTasks = selected ? tasksByDate.get(selected) || [] : [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-5xl space-y-6"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {MONTHS[month]} {year}
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <button
            onClick={prevMonth}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold">
            {MONTHS[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {DAYS.map((d, i) => (
            <div
              key={d}
              className={`py-2 text-center text-[11px] font-semibold uppercase tracking-wider ${
                i === 0 || i === 6
                  ? "text-muted-foreground/60"
                  : "text-muted-foreground"
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="divide-y divide-border">
          {grid.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7">
              {week.map((d, di) => {
                if (d === null)
                  return (
                    <div
                      key={`e-${wi}-${di}`}
                      className="min-h-[80px] bg-muted/20"
                    />
                  );

                const dateStr = formatDate(d);
                const dayTasks = tasksByDate.get(dateStr) || [];
                const isSel = selected === dateStr;
                const td = isToday(d);

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelected(isSel ? null : dateStr)}
                    className={`relative min-h-[80px] border-r border-border p-1.5 text-left transition-colors last:border-r-0 hover:bg-accent ${
                      isSel
                        ? "bg-accent ring-1 ring-inset ring-ring"
                        : ""
                    }`}
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-sm ${
                        td
                          ? "bg-foreground text-background font-medium"
                          : di === 0 || di === 6
                            ? "text-muted-foreground/60"
                            : "text-foreground"
                      }`}
                    >
                      {d}
                    </span>
                    {dayTasks.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {dayTasks.slice(0, 2).map((t) => (
                          <div key={t.id} className="flex items-center gap-1">
                            <span
                              className={`h-1 w-1 shrink-0 rounded-full ${
                                t.priority === "high"
                                  ? "bg-destructive"
                                  : t.priority === "medium"
                                    ? "bg-amber-500"
                                    : "bg-blue-500"
                              }`}
                            />
                            <span className="truncate text-[10px] leading-tight text-muted-foreground">
                              {t.title}
                            </span>
                          </div>
                        ))}
                        {dayTasks.length > 2 && (
                          <span className="pl-2 text-[10px] text-muted-foreground/60">
                            +{dayTasks.length - 2} more
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Selected date details */}
      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-border bg-card p-5"
        >
          <p className="text-sm font-medium text-muted-foreground">
            {new Date(selected + "T00:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          {selectedTasks.length > 0 ? (
            <div className="mt-3 space-y-2">
              {selectedTasks.map((t) => (
                <div
                  key={t.id}
                  className="rounded-md border border-border p-3"
                >
                  <p className="text-sm font-medium">{t.title}</p>
                  <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                    <span>{t.status.replace("_", " ")}</span>
                    <span>{t.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground/60">
              No tasks for this day
            </p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
