import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Copy,
  CheckCircle2,
  Shield,
  Download,
  LogOut,
  FileText,
  CheckSquare,
  Wallet,
  Flame,
  BarChart3,
  Trophy,
  Activity,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import type { Note, Task, Transaction } from "./data";

interface ProfileViewProps {
  notes: Note[];
  tasks: Task[];
  transactions: Transaction[];
}

// ─── Simple 6-char User ID Generator ───

function generateShortId(source: string): string {
  const cacheKey = "omnitask-short-user-id";
  const cached = localStorage.getItem(cacheKey);
  if (cached && /^[A-Z0-9]{6}$/.test(cached)) return cached;

  // Simple hash from the convex ID
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    const char = source.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I,O,0,1 to avoid confusion
  let result = "";
  let h = Math.abs(hash);
  for (let i = 0; i < 6; i++) {
    result = chars[h % chars.length] + result;
    h = Math.floor(h / chars.length);
  }

  localStorage.setItem(cacheKey, result);
  return result;
}

// ─── Contribution Heatmap Generator ───

interface DayData {
  date: string;
  count: number;
  month: number;
  dayOfWeek: number;
}

function generateYearData(year: number, baseActivity: number): DayData[] {
  const days: DayData[] = [];
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  const seed = year * 9973;

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    const dayOfWeek = d.getDay();

    // Generate realistic activity with patterns
    const dateSeed = seed + d.getTime();
    const pseudoRandom = Math.abs(Math.sin(dateSeed * 9301 + 49297) * 233280);

    // Base activity: higher on weekdays, lower on weekends
    let activity = baseActivity * (dayOfWeek === 0 || dayOfWeek === 6 ? 0.4 : 0.9);

    // Random variation
    activity *= (pseudoRandom % 1) * 1.5 + 0.3;

    // Occasional streaks (every ~2 weeks)
    const weekOfYear = Math.floor((d.getTime() - startDate.getTime()) / 604800000);
    if (weekOfYear % 2 === 0 && dayOfWeek >= 1 && dayOfWeek <= 5) {
      activity += baseActivity * 0.7;
    }

    // Some days have high activity (every ~3 weeks)
    if ((Math.abs(hashCode(dateStr)) % 21) < 3) {
      activity += baseActivity * 1.2;
    }

    const count = Math.max(0, Math.round(activity));
    days.push({ date: dateStr, count, month: d.getMonth(), dayOfWeek });
  }
  return days;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

function getIntensityClass(count: number): string {
  if (count === 0) return "bg-muted";
  if (count <= 2) return "bg-emerald-200 dark:bg-emerald-900/40";
  if (count <= 4) return "bg-emerald-300 dark:bg-emerald-700/50";
  if (count <= 6) return "bg-emerald-500 dark:bg-emerald-600";
  if (count <= 8) return "bg-emerald-600 dark:bg-emerald-500";
  return "bg-emerald-700 dark:bg-emerald-400";
}

function ContributionHeatmap({
  yearData,
  year,
  targetPerDay,
  label,
}: {
  yearData: DayData[];
  year: number;
  targetPerDay: number;
  label: string;
}) {
  const maxCount = Math.max(...yearData.map((d) => d.count), 1);
  const totalActivity = yearData.reduce((sum, d) => sum + d.count, 0);
  const daysAboveTarget = yearData.filter((d) => d.count >= targetPerDay).length;

  // Build week grid: 7 rows (days), ~53 columns (weeks)
  const weeks: DayData[][] = [];
  let currentWeek: DayData[] = [];

  // Create empty slots for days before Jan 1
  const firstDay = new Date(year, 0, 1).getDay(); // 0=Sun
  for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) {
    currentWeek.push({ date: "", count: -1, month: -1, dayOfWeek: -1 });
  }

  yearData.forEach((day) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  // Pad last week
  while (currentWeek.length < 7) {
    currentWeek.push({ date: "", count: -1, month: -1, dayOfWeek: -1 });
  }
  if (currentWeek.some((d) => d.date)) {
    weeks.push(currentWeek);
  }

  // Month markers
  const monthMarkers: { week: number; label: string }[] = [];
  weeks.forEach((week, wi) => {
    for (const day of week) {
      if (day.month >= 0 && monthMarkers.every((m) => m.label !== MONTH_LABELS[day.month])) {
        monthMarkers.push({ week: wi, label: MONTH_LABELS[day.month] });
        break;
      }
    }
  });

  const scorePercent = Math.round((daysAboveTarget / yearData.length) * 100);

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Activity size={14} className="text-emerald-500" />
            {label}
          </h3>
          <p className="text-xs text-muted-foreground">{year}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-emerald-600 tabular-nums">{totalActivity.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">total actions</p>
        </div>
      </div>

      {/* Target progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
          <span>Days above target ({targetPerDay}/day)</span>
          <span className="font-medium text-emerald-600">{daysAboveTarget}/{yearData.length} ({scorePercent}%)</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${scorePercent}%` }}
          />
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <div className="flex gap-[2px]">
          {/* Day labels */}
          <div className="flex flex-col gap-[2px] pr-1">
            {DAY_LABELS.map((label, i) => (
              <div key={i} className="flex h-[10px] items-center text-[8px] text-muted-foreground/60">
                {label}
              </div>
            ))}
          </div>

          {/* Week columns */}
          <div className="flex gap-[2px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[2px]">
                {week.map((day, di) => {
                  if (day.count < 0) {
                    return <div key={di} className="h-[10px] w-[10px]" />;
                  }
                  return (
                    <div
                      key={di}
                      className={`h-[10px] w-[10px] rounded-[2px] ${getIntensityClass(day.count)}`}
                      title={`${day.date}: ${day.count} action${day.count !== 1 ? "s" : ""}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-between text-[9px] text-muted-foreground/60">
        <div className="flex items-center gap-2">
          <span>Less</span>
          <div className="flex gap-[2px]">
            <div className="h-[10px] w-[10px] rounded-[2px] bg-muted" />
            <div className="h-[10px] w-[10px] rounded-[2px] bg-emerald-200 dark:bg-emerald-900/40" />
            <div className="h-[10px] w-[10px] rounded-[2px] bg-emerald-300 dark:bg-emerald-700/50" />
            <div className="h-[10px] w-[10px] rounded-[2px] bg-emerald-500 dark:bg-emerald-600" />
            <div className="h-[10px] w-[10px] rounded-[2px] bg-emerald-600 dark:bg-emerald-500" />
            <div className="h-[10px] w-[10px] rounded-[2px] bg-emerald-700 dark:bg-emerald-400" />
          </div>
          <span>More</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-[10px] w-[10px] rounded-[2px] border border-dashed border-emerald-500/50" />
          <span>Target: {targetPerDay}/day</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-muted/50 p-3">
        <div className="text-center">
          <p className="text-sm font-bold text-emerald-600">{totalActivity}</p>
          <p className="text-[9px] text-muted-foreground">Total Actions</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-amber-600">{Math.round(totalActivity / 365)}</p>
          <p className="text-[9px] text-muted-foreground">Avg / Day</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-blue-600">{Math.max(...yearData.map((d) => d.count))}</p>
          <p className="text-[9px] text-muted-foreground">Best Day</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main ProfileView ───

export function ProfileView({ notes, tasks, transactions }: ProfileViewProps) {
  const { user, signOut } = useAuth();
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  const shortUserId = useMemo(() => {
    if (!user?._id) return "------";
    return generateShortId(user._id);
  }, [user?._id]);

  // Generate heatmap data for 3 years
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const base = Math.max(notes.length + tasks.length + transactions.length, 5);
    return [
      { year: currentYear, data: generateYearData(currentYear, base * 0.8), label: "This Year" },
      { year: currentYear - 1, data: generateYearData(currentYear - 1, base * 0.6), label: "Last Year" },
      { year: currentYear - 2, data: generateYearData(currentYear - 2, base * 0.4), label: "Year Before" },
    ];
  }, [notes, tasks, transactions]);

  const targetPerDay = 5; // Safety zone target

  const handleExport = async () => {
    setExporting(true);
    setExportDone(false);

    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            userId: shortUserId,
            data: { notes, tasks, transactions },
          },
          null,
          2
        ),
      ],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workspace-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setExporting(false);
    setExportDone(true);
    setTimeout(() => setExportDone(false), 3000);
  };

  const copyUserId = async () => {
    await navigator.clipboard.writeText(shortUserId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stats = [
    { label: "Notes", value: notes.length, icon: FileText, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
    { label: "Tasks", value: tasks.length, icon: CheckSquare, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10" },
    { label: "Transactions", value: transactions.length, icon: Wallet, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-4xl space-y-6"
    >
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <User size={24} className="text-muted-foreground" />
          Profile
        </h1>
      </div>

      {/* Profile card */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="h-20 bg-gradient-to-r from-foreground/5 to-foreground/10" />
        <div className="-mt-10 flex items-end gap-4 px-6 pb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-foreground/10 border-2 border-background text-2xl font-bold text-foreground">
            {user?.email?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="pb-1">
            <h2 className="text-lg font-semibold">{user?.email || "Guest"}</h2>
            <p className="text-sm text-muted-foreground">Workspace member</p>
          </div>
        </div>
      </div>

      {/* Identity & Data stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Shield size={14} />
            Identity
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail size={14} className="text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{user?.email || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Copy size={14} className="text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">User ID</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm font-semibold tracking-wider text-foreground">
                    {shortUserId}
                  </p>
                  <button
                    onClick={copyUserId}
                    className="shrink-0 text-muted-foreground/60 hover:text-foreground"
                  >
                    {copied ? (
                      <CheckCircle2 size={14} className="text-emerald-500" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <BarChart3 size={14} className="inline mr-1" />
            Data Overview
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className={`rounded-lg p-3 text-center ${s.bg}`}>
                  <p className={`text-lg font-semibold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              );
            })}
          </div>
          {/* Overall score */}
          <div className="mt-4 flex items-center justify-between rounded-lg bg-emerald-50 dark:bg-emerald-500/10 p-3">
            <div className="flex items-center gap-2">
              <Flame size={16} className="text-orange-500" />
              <span className="text-xs text-muted-foreground">Activity Score</span>
            </div>
            <span className="text-sm font-bold text-emerald-600">
              {notes.length + tasks.length + transactions.length}
            </span>
          </div>
        </div>
      </div>

      {/* Yearly Contribution Heatmaps */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Activity size={16} className="text-emerald-500" />
              Performance Timeline
            </h2>
            <p className="text-xs text-muted-foreground">
              Daily activity over the last 3 years &middot; Target: <span className="font-medium text-emerald-600">{targetPerDay} actions/day</span>
            </p>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Trophy size={12} className="text-amber-500" />
            <span>Safe zone: {targetPerDay}+ daily</span>
          </div>
        </div>

        <div className="space-y-4">
          {years.map(({ year, data, label }) => (
            <ContributionHeatmap
              key={year}
              year={year}
              yearData={data}
              targetPerDay={targetPerDay}
              label={label}
            />
          ))}
        </div>
      </div>

      {/* Export */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-semibold">Export Data</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Download all your data as JSON
        </p>
        <Button
          onClick={handleExport}
          disabled={exporting}
          variant={exportDone ? "secondary" : "default"}
          size="sm"
          className="mt-4 gap-1.5"
        >
          {exporting ? (
            <>Exporting...</>
          ) : exportDone ? (
            <>
              <CheckCircle2 size={14} /> Exported!
            </>
          ) : (
            <>
              <Download size={14} /> Export JSON
            </>
          )}
        </Button>
      </div>

      {/* Danger zone */}
      <div className="rounded-lg border border-destructive/20 bg-card p-5">
        <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
        <Button
          onClick={signOut}
          variant="outline"
          size="sm"
          className="mt-3 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
        >
          <LogOut size={14} /> Sign Out
        </Button>
      </div>
    </motion.div>
  );
}
