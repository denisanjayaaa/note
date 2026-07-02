import { useMemo } from "react";
import { motion } from "framer-motion";
import { FileText, CheckSquare, Wallet, ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
import type { Note, Task, Transaction } from "./data";
import { DueDateReminder } from "./DueDateReminder";
import { ExpenseChart } from "./ExpenseChart";

interface DashboardViewProps {
  notes: Note[];
  tasks: Task[];
  transactions: Transaction[];
  totalIncome: number;
  totalExpense: number;
  balance: number;
  onNavigate: (tab: "tasks") => void;
}

export function DashboardView({
  notes,
  tasks,
  transactions,
  totalIncome,
  totalExpense,
  balance,
  onNavigate,
}: DashboardViewProps) {
  const stats = useMemo(
    () => [
      {
        label: "Notes",
        value: notes.length,
        icon: FileText,
        color: "text-blue-500",
        bg: "bg-blue-50 dark:bg-blue-500/10",
      },
      {
        label: "Tasks",
        value: tasks.filter((t) => t.status !== "done").length,
        icon: CheckSquare,
        color: "text-amber-500",
        bg: "bg-amber-50 dark:bg-amber-500/10",
      },
      {
        label: "Balance",
        value: `Rp ${(balance).toLocaleString("id-ID")}`,
        icon: Wallet,
        color: balance >= 0 ? "text-emerald-500" : "text-destructive",
        bg: "bg-emerald-50 dark:bg-emerald-500/10",
      },
      {
        label: "Completed",
        value: tasks.filter((t) => t.status === "done").length,
        icon: TrendingUp,
        color: "text-violet-500",
        bg: "bg-violet-50 dark:bg-violet-500/10",
      },
    ],
    [notes, tasks, balance]
  );

  const recentActivity = useMemo(() => {
    const items: { id: string; type: string; title: string; date: string }[] =
      [];
    notes.forEach((n) =>
      items.push({ id: n.id, type: "note", title: n.title, date: n.created_at })
    );
    transactions.slice(0, 5).forEach((t) =>
      items.push({
        id: t.id,
        type: t.type === "income" ? "income" : "expense",
        title: `${t.category}: Rp ${Number(t.amount).toLocaleString("id-ID")}`,
        date: t.transaction_date,
      })
    );
    return items.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [notes, transactions]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-6xl space-y-8"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your workspace
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-lg border border-border bg-card p-5"
            >
              <div className="flex items-center justify-between">
                <div className={`rounded-md p-2 ${stat.bg}`}>
                  <Icon size={18} className={stat.color} />
                </div>
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight">
                {stat.value}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {stat.label}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Main content area */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Due date reminders */}
        <div className="lg:col-span-2">
          <DueDateReminder
            tasks={tasks}
            onTaskClick={() => onNavigate("tasks")}
          />
        </div>

        {/* Quick balance summary */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Financial Summary
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUpRight size={14} className="text-emerald-500" />
                <span className="text-sm text-muted-foreground">Income</span>
              </div>
              <span className="text-sm font-medium text-emerald-600 tabular-nums">
                Rp {totalIncome.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowDownRight size={14} className="text-destructive" />
                <span className="text-sm text-muted-foreground">Expenses</span>
              </div>
              <span className="text-sm font-medium tabular-nums">
                Rp {totalExpense.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Balance</span>
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    balance >= 0 ? "text-emerald-600" : "text-destructive"
                  }`}
                >
                  Rp {balance.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ExpenseChart transactions={transactions} />
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Activity
          </h3>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          ) : (
            <div className="space-y-2">
              {recentActivity.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent"
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      item.type === "income"
                        ? "bg-emerald-500"
                        : item.type === "expense"
                          ? "bg-destructive"
                          : "bg-blue-500"
                    }`}
                  />
                  <span className="flex-1 truncate">{item.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {item.type === "note" ? "Note" : item.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
