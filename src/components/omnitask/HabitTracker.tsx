import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Flame,
  Trophy,
  CheckCircle2,
  Circle,
  Target,
  BarChart3,
  Edit3,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Habit } from "./data";

const HABIT_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

const HABIT_ICONS = ["🔥", "💪", "📚", "🧘", "🏃", "🎯", "💧", "🌱", "🎨", "✍️", "🧠", "☕"];

interface HabitTrackerProps {
  habits: Habit[];
  addHabit: (name: string, color: string, icon: string) => Promise<void>;
  logHabit: (id: string, date: string, done: boolean) => Promise<void>;
  removeHabit: (id: string) => Promise<void>;
  updateHabit?: (id: string, data: { name?: string; color?: string; icon?: string }) => Promise<void>;
}

function getDateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getTodayKey(): string {
  return getDateKey(new Date());
}

function getLast30Days(): string[] {
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(getDateKey(d));
  }
  return days;
}

// ─── Edit Habit Modal ───

function EditHabitModal({
  habit,
  onSave,
  onClose,
}: {
  habit: Habit;
  onSave: (id: string, data: { name: string; color: string; icon: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(habit.name);
  const [color, setColor] = useState(habit.color);
  const [icon, setIcon] = useState(habit.icon);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(habit.id, { name: name.trim(), color, icon });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl"
        >
          <form onSubmit={handleSave} className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Edit Habit</h3>
              <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-accent">
                <X size={15} />
              </button>
            </div>

            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Habit name..."
              autoFocus
            />

            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Icon</p>
              <div className="flex flex-wrap gap-2">
                {HABIT_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    className={`flex h-8 w-8 items-center justify-center rounded-md text-base transition-all ${
                      icon === ic
                        ? "bg-accent ring-1 ring-ring scale-110"
                        : "bg-muted hover:bg-accent/50"
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Color</p>
              <div className="flex gap-2">
                {HABIT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-7 w-7 rounded-full transition-all ${
                      color === c ? "ring-2 ring-ring ring-offset-2 scale-110" : ""
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" size="sm" disabled={!name.trim()} className="gap-1">
                <Check size={13} /> Save
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={onClose} className="gap-1">
                Cancel
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </>
  );
}

// ─── Main HabitTracker ───

export function HabitTracker({ habits, addHabit, logHabit, removeHabit, updateHabit }: HabitTrackerProps) {
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(HABIT_COLORS[3]);
  const [newIcon, setNewIcon] = useState(HABIT_ICONS[1]);
  const [selectedHabit, setSelectedHabit] = useState<string | null>(null);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  const todayKey = getTodayKey();
  const last30Days = useMemo(() => getLast30Days(), []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await addHabit(newName.trim(), newColor, newIcon);
    setNewName("");
    setNewColor(HABIT_COLORS[3]);
    setNewIcon(HABIT_ICONS[1]);
    setShowForm(false);
  };

  const handleEditSave = (id: string, data: { name: string; color: string; icon: string }) => {
    updateHabit?.(id, data);
  };

  const isDoneToday = (habit: Habit) => {
    return habit.logs.some((l) => l.date === todayKey && l.done);
  };

  const getDayCell = (habit: Habit, dateKey: string) => {
    const log = habit.logs.find((l) => l.date === dateKey);
    if (!log) return null;
    return log.done;
  };

  const today = new Date();
  const currentMonth = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const startPad = firstDay.getDay();

  const monthDays: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) monthDays.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) monthDays.push(d);
  while (monthDays.length % 7 !== 0) monthDays.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < monthDays.length; i += 7) {
    weeks.push(monthDays.slice(i, i + 7));
  }

  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const allTimeStats = useMemo(() => {
    let totalLogs = 0;
    let totalDone = 0;
    habits.forEach((h) => {
      totalLogs += h.logs.length;
      totalDone += h.logs.filter((l) => l.done).length;
    });
    return { totalLogs, totalDone, totalHabits: habits.length };
  }, [habits]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-6xl space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Target size={24} className="text-rose-500" />
            Habits
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track daily habits and build streaks
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          size="sm"
          className="gap-1.5"
        >
          <Plus size={15} />
          New Habit
        </Button>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-blue-500" />
            <span className="text-xs text-muted-foreground">Habits</span>
          </div>
          <p className="mt-1 text-2xl font-semibold">{allTimeStats.totalHabits}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-orange-500" />
            <span className="text-xs text-muted-foreground">Best Streak</span>
          </div>
          <p className="mt-1 text-2xl font-semibold">
            {Math.max(...habits.map((h) => h.longest_streak), 0)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-emerald-500" />
            <span className="text-xs text-muted-foreground">Today Done</span>
          </div>
          <p className="mt-1 text-2xl font-semibold">
            {habits.filter((h) => isDoneToday(h)).length}/{habits.length}
          </p>
        </div>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onSubmit={handleAdd}
            className="rounded-lg border border-border bg-card p-5"
          >
            <div className="space-y-4">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Habit name..."
                className="text-base"
              />
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Choose icon</p>
                <div className="flex flex-wrap gap-2">
                  {HABIT_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setNewIcon(icon)}
                      className={`flex h-8 w-8 items-center justify-center rounded-md text-base transition-all ${
                        newIcon === icon
                          ? "bg-accent ring-1 ring-ring scale-110"
                          : "bg-muted hover:bg-accent/50"
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Choose color</p>
                <div className="flex gap-2">
                  {HABIT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewColor(color)}
                      className={`h-7 w-7 rounded-full transition-all ${
                        newColor === color ? "ring-2 ring-ring ring-offset-2 scale-110" : ""
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button type="submit" size="sm" disabled={!newName.trim()}>
                Create Habit
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Habit cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {habits.map((habit, idx) => {
          const doneToday = isDoneToday(habit);
          const cells = last30Days.map((d) => getDayCell(habit, d));

          return (
            <motion.div
              key={habit.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`rounded-lg border bg-card transition-all hover:shadow-sm ${
                selectedHabit === habit.id ? "border-ring ring-1 ring-ring" : "border-border"
              }`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3" style={{ color: habit.color }}>
                    <span className="text-xl">{habit.icon}</span>
                    <div>
                      <h3 className="text-sm font-semibold">{habit.name}</h3>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Flame size={12} />
                          {habit.streak} day streak
                        </span>
                        <span className="flex items-center gap-1">
                          <Trophy size={12} />
                          Best: {habit.longest_streak}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => logHabit(habit.id, todayKey, !doneToday)}
                      className={`rounded-md p-1.5 transition-colors ${
                        doneToday
                          ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10"
                          : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-accent"
                      }`}
                      title={doneToday ? "Mark as not done" : "Mark as done"}
                    >
                      {doneToday ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </button>
                    <button
                      onClick={() => setSelectedHabit(selectedHabit === habit.id ? null : habit.id)}
                      className="rounded-md p-1.5 text-muted-foreground/40 hover:text-muted-foreground hover:bg-accent"
                      title="View details"
                    >
                      <BarChart3 size={14} />
                    </button>
                    {updateHabit && (
                      <button
                        onClick={() => setEditingHabit(habit)}
                        className="rounded-md p-1.5 text-muted-foreground/40 hover:text-foreground hover:bg-accent"
                        title="Edit habit"
                      >
                        <Edit3 size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => removeHabit(habit.id)}
                      className="rounded-md p-1.5 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10"
                      title="Delete habit"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* 30-day mini heatmap */}
                <div className="mt-3">
                  <div className="flex gap-[2px]">
                    {cells.slice(0, 30).map((done, i) => (
                      <div
                        key={i}
                        className={`h-3 flex-1 rounded-sm transition-colors ${
                          done === true
                            ? "bg-emerald-400 dark:bg-emerald-500"
                            : done === false
                              ? "bg-red-200 dark:bg-red-900/40"
                              : "bg-muted"
                        }`}
                        title={
                          done === true
                            ? `Done on ${last30Days[i]}`
                            : done === false
                              ? `Missed on ${last30Days[i]}`
                              : last30Days[i]
                        }
                      />
                    ))}
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-muted-foreground/60">
                    <span>{new Date(last30Days[0]).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    <span>Today</span>
                  </div>
                </div>
              </div>

              {/* Detail expand */}
              <AnimatePresence>
                {selectedHabit === habit.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-border"
                  >
                    <div className="p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">This Month</span>
                        <span className="text-xs text-muted-foreground/60">{currentMonth}</span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr>
                              {DAY_LABELS.map((d) => (
                                <th key={d} className="p-1 text-[10px] font-medium text-muted-foreground/60">
                                  {d[0]}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {weeks.map((week, wi) => (
                              <tr key={wi}>
                                {week.map((day, di) => {
                                  if (day === null) return <td key={di} className="p-1" />;
                                  const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                  const log = habit.logs.find((l) => l.date === dateKey);
                                  const isToday = dateKey === todayKey;

                                  return (
                                    <td key={di} className="p-1">
                                      <button
                                        onClick={() => logHabit(habit.id, dateKey, !log?.done)}
                                        className={`flex h-8 w-8 items-center justify-center rounded-md text-xs transition-all ${
                                          isToday ? "ring-1 ring-ring" : ""
                                        } ${
                                          log?.done
                                            ? "bg-emerald-400 text-white dark:bg-emerald-500"
                                            : log && !log.done
                                              ? "bg-red-100 text-red-500 dark:bg-red-900/30"
                                              : "bg-muted text-muted-foreground/60 hover:bg-accent"
                                        }`}
                                      >
                                        {day}
                                      </button>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-muted/50 p-3">
                        <div className="text-center">
                          <p className="text-lg font-bold" style={{ color: habit.color }}>
                            {habit.logs.filter((l) => l.done).length}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Total Done</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold" style={{ color: habit.color }}>
                            {habit.streak}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Current Streak</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold" style={{ color: habit.color }}>
                            {habit.longest_streak}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Best Streak</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {habits.length === 0 && !showForm && (
        <div className="py-16 text-center">
          <Target size={32} className="mx-auto text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">
            No habits yet. Start tracking your daily routines!
          </p>
        </div>
      )}

      {/* Edit modal */}
      {editingHabit && (
        <EditHabitModal
          habit={editingHabit}
          onSave={handleEditSave}
          onClose={() => setEditingHabit(null)}
        />
      )}
    </motion.div>
  );
}
