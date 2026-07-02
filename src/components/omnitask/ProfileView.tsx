import { useState } from "react";
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
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import type { Note, Task, Transaction } from "./data";

interface ProfileViewProps {
  notes: Note[];
  tasks: Task[];
  transactions: Transaction[];
}

export function ProfileView({ notes, tasks, transactions }: ProfileViewProps) {
  const { user, signOut } = useAuth();
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    setExportDone(false);

    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            data: {
              notes,
              tasks,
              transactions,
            },
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
    if (!user?.id) return;
    await navigator.clipboard.writeText(user.id);
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
      className="mx-auto max-w-3xl space-y-6"
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
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {user?.id || "—"}
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
