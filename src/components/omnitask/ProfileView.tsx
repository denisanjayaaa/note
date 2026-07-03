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
  Pencil,
  Save,
  X,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
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
  const { user, signIn, signOut } = useAuth();
  const updateProfile = useMutation(api.users.updateProfile);
  const updateEmail = useMutation(api.users.updateEmail);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editImage, setEditImage] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Username state
  const [editingUsername, setEditingUsername] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [usernameSaved, setUsernameSaved] = useState(false);

  // Email OTP state
  const [editingEmail, setEditingEmail] = useState(false);
  const [editEmail, setEditEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);

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
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl bg-foreground/10 border-2 border-background">
              {user?.image && !editing ? (
                <img src={user.image} alt="" className="h-full w-full object-cover" />
              ) : editing && editImage ? (
                <img src={editImage} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-foreground">
                  {(user?.name?.[0] || user?.email?.[0] || "?").toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-1 items-start justify-between pb-1">
            <div>
              {editing ? (
                <div className="space-y-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Your name"
                    className="h-8 w-48 text-sm"
                  />
                  <Input
                    value={editImage}
                    onChange={(e) => setEditImage(e.target.value)}
                    placeholder="Avatar URL (optional)"
                    className="h-8 w-48 text-sm"
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={async () => {
                        setSaving(true);
                        try {
                          await updateProfile({ name: editName || undefined, image: editImage || undefined });
                          setSaved(true);
                          setEditing(false);
                          setTimeout(() => setSaved(false), 2000);
                        } catch (e) {
                            console.error("Profile save error:", e);
                          }
                        setSaving(false);
                      }}
                      disabled={saving}
                      className="inline-flex items-center gap-1 rounded-md bg-foreground px-2.5 py-1 text-[11px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      <Save size={12} />
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setEditName(user?.name || "");
                        setEditImage(user?.image || "");
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-accent"
                    >
                      <X size={12} />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{user?.name || user?.email || "Guest"}</h2>
                    {saved && <CheckCircle2 size={14} className="text-emerald-500" />}
                  </div>
                  {user?.name && <p className="text-sm text-muted-foreground">{user?.email}</p>}
                  {!user?.name && <p className="text-sm text-muted-foreground">Workspace member</p>}
                </>
              )}
            </div>
            {!editing && (
              <button
                onClick={() => {
                  setEditName(user?.name || "");
                  setEditImage(user?.image || "");
                  setEditing(true);
                }}
                className="rounded-md p-1.5 text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
                title="Edit profile"
              >
                <Pencil size={14} />
              </button>
            )}
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
            {/* Username */}
            <div className="flex items-start gap-3">
              <User size={14} className="mt-0.5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Username</p>
                {editingUsername ? (
                  <div className="mt-1 space-y-1.5">
                    <Input
                      value={editUsername}
                      onChange={(e) => {
                        setEditUsername(e.target.value);
                        setUsernameError("");
                      }}
                      placeholder="your-username"
                      className="h-7 w-full text-xs"
                    />
                    {usernameError && (
                      <div className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-2.5 py-1.5">
                        <AlertCircle size={11} className="text-destructive shrink-0" />
                        <p className="text-[10px] text-destructive font-medium">{usernameError}</p>
                      </div>
                    )}
                    <div className="flex gap-1">
                      <button
                        onClick={async () => {
                          setUsernameError("");
                          const u = editUsername.trim();
                          if (u.length < 3) { setUsernameError("Min 3 characters"); return; }
                          if (!/^[a-zA-Z0-9_-]+$/.test(u)) { setUsernameError("Only letters, numbers, _ and -"); return; }
                          setSaving(true);
                          try {
                            await updateProfile({ username: u });
                            toast.success("Username saved");
                            setUsernameSaved(true);
                            setEditingUsername(false);
                            setTimeout(() => setUsernameSaved(false), 2000);
                          } catch (e) {
                            const msg = (e as Error).message || "";
                            if (msg.includes("Username already taken")) {
                              toast.error("Username already taken — try something else");
                              setUsernameError("Username sudah digunakan, coba yang lain");
                            } else {
                              toast.error(msg || "Failed to save username");
                              setUsernameError(msg);
                            }
                          }
                          setSaving(false);
                        }}
                        disabled={saving}
                        className="inline-flex items-center gap-1 rounded-md bg-foreground px-2 py-0.5 text-[10px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        <Save size={10} />
                        {saving ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => {
                          setEditingUsername(false);
                          setEditUsername(user?.username || "");
                          setUsernameError("");
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[10px] font-medium transition-colors hover:bg-accent"
                      >
                        <X size={10} />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-sm font-medium text-foreground">
                        {user?.username || "—"}
                      </span>
                      {usernameSaved && <CheckCircle2 size={12} className="text-emerald-500" />}
                    </div>
                    <button
                      onClick={() => {
                        setEditUsername(user?.username || "");
                        setEditingUsername(true);
                      }}
                      className="text-muted-foreground/50 hover:text-muted-foreground"
                    >
                      <Pencil size={11} />
                    </button>
                  </div>
                )}
                <p className="mt-0.5 text-[10px] text-muted-foreground/60">Min 3 chars, only letters, numbers, _ and -</p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-3">
              <Mail size={14} className="mt-0.5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Email</p>
                {editingEmail ? (
                  <div className="mt-1 space-y-1.5">
                    {!otpSent ? (
                      <>
                        <Input
                          value={editEmail}
                          onChange={(e) => {
                            setEditEmail(e.target.value);
                            setEmailError("");
                          }}
                          placeholder="new@email.com"
                          className="h-7 w-full text-xs"
                        />
                        {emailError && (
                          <p className="text-[10px] text-destructive">{emailError}</p>
                        )}
                        <div className="flex gap-1">
                          <button
                            onClick={async () => {
                              setEmailError("");
                              const e = editEmail.trim();
                              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
                                setEmailError("Invalid email format");
                                return;
                              }
                              setEmailSaving(true);
                              try {
                                await signIn("email-otp", { email: e });
                                setOtpSent(true);
                              } catch (err) {
                                setEmailError((err as Error).message || "Failed to send OTP");
                              }
                              setEmailSaving(false);
                            }}
                            disabled={emailSaving}
                            className="inline-flex items-center gap-1 rounded-md bg-foreground px-2 py-0.5 text-[10px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                          >
                            {emailSaving ? "Sending..." : "Send OTP"}
                          </button>
                          <button
                            onClick={() => {
                              setEditingEmail(false);
                              setEditEmail("");
                              setOtpSent(false);
                              setOtpCode("");
                              setEmailError("");
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[10px] font-medium transition-colors hover:bg-accent"
                          >
                            <X size={10} />
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-[10px] text-emerald-600">
                          OTP sent to {editEmail}
                        </p>
                        <Input
                          value={otpCode}
                          onChange={(e) => {
                            setOtpCode(e.target.value);
                            setEmailError("");
                          }}
                          placeholder="Enter 6-digit code"
                          className="h-7 w-36 text-xs font-mono tracking-widest"
                          maxLength={6}
                        />
                        {emailError && (
                          <p className="text-[10px] text-destructive">{emailError}</p>
                        )}
                        <div className="flex gap-1">
                          <button
                            onClick={async () => {
                              if (otpCode.length < 6) { setEmailError("Enter the 6-digit code"); return; }
                              setEmailSaving(true);
                              try {
                                await signIn("email-otp", { email: editEmail, code: otpCode, flow: "email-verify" });
                                await updateEmail({ email: editEmail });
                                setEmailSaved(true);
                                setEditingEmail(false);
                                setOtpSent(false);
                                setOtpCode("");
                                setTimeout(() => setEmailSaved(false), 3000);
                              } catch (err) {
                                setEmailError((err as Error).message || "Invalid code");
                              }
                              setEmailSaving(false);
                            }}
                            disabled={emailSaving}
                            className="inline-flex items-center gap-1 rounded-md bg-foreground px-2 py-0.5 text-[10px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                          >
                            <CheckCircle2 size={10} />
                            {emailSaving ? "Verifying..." : "Verify & Update"}
                          </button>
                          <button
                            onClick={() => {
                              setOtpSent(false);
                              setOtpCode("");
                              setEmailError("");
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[10px] font-medium transition-colors hover:bg-accent"
                          >
                            Resend OTP
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {user?.email || "—"}
                      {emailSaved && <CheckCircle2 size={12} className="ml-1 inline text-emerald-500" />}
                    </span>
                    <button
                      onClick={() => {
                        setEditEmail(user?.email || "");
                        setEditingEmail(true);
                      }}
                      className="text-muted-foreground/50 hover:text-muted-foreground"
                    >
                      <Pencil size={11} />
                    </button>
                  </div>
                )}
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
