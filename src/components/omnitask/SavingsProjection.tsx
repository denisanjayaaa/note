import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PiggyBank,
  TrendingUp,
  Calendar,
  Target,
  Plus,
  Trash2,
  Check,
  X,
  BarChart3,
  Settings2,
  Sparkles,
  Lightbulb,
  Clock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Transaction } from "./data";

// ─── Types ───

interface FinancialGoal {
  id: string;
  name: string;
  target: number;
  targetYear?: number;
}

interface SavingsProjectionProps {
  transactions: Transaction[];
  balance: number;
  totalIncome: number;
  totalExpense: number;
}

// ─── Compound Interest Calculator ───

function calculateProjection(
  monthlySaving: number,
  currentBalance: number,
  interestRate: number,
  years: number
) {
  const data: {
    year: number;
    totalWithoutInterest: number;
    totalWithInterest: number;
    annualContribution: number;
    interestEarned: number;
  }[] = [];

  let cumWithoutInterest = currentBalance;
  let cumWithInterest = currentBalance;

  for (let y = 1; y <= years; y++) {
    const annualContribution = monthlySaving * 12;

    // Without interest: just stacking
    cumWithoutInterest += annualContribution;

    // With interest: compound on balance + new contributions
    // Using end-of-year compounding: balance grows by interest, then add contributions
    cumWithInterest = cumWithInterest * (1 + interestRate / 100) + annualContribution;

    const interestEarned = cumWithInterest - cumWithoutInterest;

    data.push({
      year: y,
      totalWithoutInterest: Math.round(cumWithoutInterest),
      totalWithInterest: Math.round(cumWithInterest),
      annualContribution: annualContribution,
      interestEarned: Math.round(interestEarned),
    });
  }

  return data;
}

function calculateGoalTime(
  goalTarget: number,
  monthlySaving: number,
  currentBalance: number,
  interestRate: number
): { years: number; totalSaved: number; achievable: boolean } {
  if (monthlySaving <= 0 && currentBalance >= goalTarget) {
    return { years: 0, totalSaved: currentBalance, achievable: true };
  }
  if (monthlySaving <= 0) {
    return { years: Infinity, totalSaved: currentBalance, achievable: false };
  }

  let balance = currentBalance;
  let years = 0;
  const maxYears = 100;

  while (balance < goalTarget && years < maxYears) {
    balance = balance * (1 + interestRate / 100) + monthlySaving * 12;
    years++;
  }

  return {
    years,
    totalSaved: Math.round(balance),
    achievable: years < maxYears,
  };
}

// ─── Tips berdasarkan kondisi ───

function getFinancialTips(
  monthlySaving: number,
  totalIncome: number,
  totalExpense: number,
  goalTime: number
): string[] {
  const tips: string[] = [];
  const savingRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  if (savingRate < 10 && totalIncome > 0) {
    tips.push("Coba tingkatkan tabungan minimal 10% dari pemasukan. Mulai dari 5% dulu.");
  }
  if (totalExpense > totalIncome) {
    tips.push("Pengeluaran lebih besar dari pemasukan! Coba kurangi pengeluaran tidak penting.");
  }
  if (monthlySaving > 0 && monthlySaving < 100000) {
    tips.push("Menabung Rp " + monthlySaving.toLocaleString("id-ID") + "/bulan itu awal yang baik! Coba naikkan perlahan.");
  }
  if (goalTime > 30 && goalTime < Infinity) {
    tips.push("Tujuan keuanganmu mungkin butuh waktu lama. Coba naikkan tabungan bulanan atau cari investasi dengan bunga lebih tinggi.");
  }
  if (goalTime <= 12) {
    tips.push("Tujuan keuanganmu bisa tercapai dalam " + goalTime + " tahun! Luar biasa, tetap konsisten!");
  }

  if (tips.length === 0) {
    tips.push("Kamu sudah di jalur yang tepat untuk mencapai tujuan keuangan!");
  }

  return tips;
}

// ─── Component ───

export function SavingsProjection({
  transactions,
  balance,
  totalIncome,
  totalExpense,
}: SavingsProjectionProps) {
  // ─── Derived defaults ───
  // Calculate average monthly saving from last 3 months of transactions
  const defaultMonthlySaving = useMemo(() => {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const recentTx = transactions.filter((t) => {
      if (!t.transaction_date) return false;
      return t.transaction_date >= threeMonthsAgo.toISOString().split("T")[0];
    });
    const income = recentTx.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
    const expense = recentTx.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
    const saving = Math.max(0, income - expense);
    // Divide by months of data (at least 1)
    const months = Math.max(1, Math.round((now.getTime() - threeMonthsAgo.getTime()) / 2592000000));
    return Math.round(saving / months);
  }, [transactions]);

  // ─── Editable State ───
  const [monthlySaving, setMonthlySaving] = useState(() =>
    Math.max(0, Math.round((totalIncome - totalExpense) / Math.max(1, transactions.length / 10)))
  );
  const [currentBalance, setCurrentBalance] = useState(balance);
  const [interestRate, setInterestRate] = useState(6); // Default 6% (reasonable for Indonesia)
  const [projectionYears, setProjectionYears] = useState(10);
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goals, setGoals] = useState<FinancialGoal[]>([
    { id: "1", name: "Dana Darurat (6 bulan biaya hidup)", target: totalExpense * 6 || 30000000 },
  ]);
  const [chartMode, setChartMode] = useState<"bar" | "area">("bar");
  const [showSettings, setShowSettings] = useState(false);

  // Reset monthly saving when transactions change significantly
  const [prevDefault, setPrevDefault] = useState(defaultMonthlySaving);
  if (defaultMonthlySaving !== prevDefault && monthlySaving === 0) {
    setMonthlySaving(defaultMonthlySaving);
    setPrevDefault(defaultMonthlySaving);
  }

  // ─── Calculations ───
  const projectionData = useMemo(
    () => calculateProjection(monthlySaving, currentBalance, interestRate, projectionYears),
    [monthlySaving, currentBalance, interestRate, projectionYears]
  );

  const totals = useMemo(() => {
    if (projectionData.length === 0) return { withInterest: 0, withoutInterest: 0, interestEarned: 0 };
    const last = projectionData[projectionData.length - 1];
    return {
      withInterest: last.totalWithInterest,
      withoutInterest: last.totalWithoutInterest,
      interestEarned: last.interestEarned,
    };
  }, [projectionData]);

  const goalResults = useMemo(
    () =>
      goals.map((goal) => ({
        ...goal,
        ...calculateGoalTime(goal.target, monthlySaving, currentBalance, interestRate),
      })),
    [goals, monthlySaving, currentBalance, interestRate]
  );

  const tips = useMemo(
    () =>
      getFinancialTips(
        monthlySaving,
        totalIncome,
        totalExpense,
        goalResults[0]?.years ?? Infinity
      ),
    [monthlySaving, totalIncome, totalExpense, goalResults]
  );

  // ─── Goal handlers ───
  const addGoal = useCallback(() => {
    if (!goalName.trim() || !goalTarget || Number(goalTarget) <= 0) return;
    setGoals((prev) => [
      ...prev,
      { id: Date.now().toString(), name: goalName.trim(), target: Number(goalTarget) },
    ]);
    setGoalName("");
    setGoalTarget("");
  }, [goalName, goalTarget]);

  const removeGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const defaultFromActual = useCallback(() => {
    setMonthlySaving(defaultMonthlySaving);
    setCurrentBalance(balance);
  }, [defaultMonthlySaving, balance]);

  // ─── Format helper ───
  const fmt = (n: number) => "Rp " + n.toLocaleString("id-ID");

  // ─── Custom tooltip ───
  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-lg">
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">
          Tahun ke-{label}
        </p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="flex items-center gap-2 text-xs" style={{ color: p.color }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}: <span className="font-semibold">{fmt(p.value)}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">
            <TrendingUp size={16} />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Rencana Tabungan</h2>
            <p className="text-xs text-muted-foreground">
              Proyeksi tabungan & tujuan jangka panjang
            </p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setChartMode(chartMode === "bar" ? "area" : "bar")}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-muted-foreground/30 hover:text-foreground"
          >
            {chartMode === "bar" ? <BarChart3 size={14} /> : <TrendingUp size={14} />}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSettings(!showSettings)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              showSettings
                ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400"
                : "border-border text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
            }`}
          >
            <Settings2 size={14} />
          </motion.button>
        </div>
      </div>

      {/* ─── Summary Cards ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-border bg-gradient-to-br from-violet-600 to-violet-800 p-5 text-white shadow-lg"
        >
          <p className="text-xs font-medium text-violet-100/80">Total Tabungan ({projectionYears} tahun)</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight">
            {fmt(totals.withInterest)}
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-violet-200">
            <TrendingUp size={12} />
            <span>Termasuk bunga {interestRate}%</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-5"
        >
          <p className="text-xs font-medium text-muted-foreground">
            Tabungan Tanpa Bunga
          </p>
          <p className="mt-1.5 text-xl font-bold tabular-nums">
            {fmt(totals.withoutInterest)}
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
            <PiggyBank size={12} />
            <span>{fmt(monthlySaving)}/bulan</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-border bg-card p-5"
        >
          <p className="text-xs font-medium text-muted-foreground">
            Bunga Didapatkan
          </p>
          <p className="mt-1.5 text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {fmt(totals.interestEarned)}
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar size={12} />
            <span>{interestRate}% per tahun</span>
          </div>
        </motion.div>
      </div>

      {/* ─── Settings Panel ─── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground">🛠️ Atur Parameter</p>
              <button
                onClick={defaultFromActual}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Sparkles size={11} />
                Pakai data aktual
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  💰 Tabungan per Bulan
                </label>
                <Input
                  type="number"
                  value={monthlySaving || ""}
                  onChange={(e) => setMonthlySaving(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                  min="0"
                  className="text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  🏦 Saldo Awal
                </label>
                <Input
                  type="number"
                  value={currentBalance || ""}
                  onChange={(e) => setCurrentBalance(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                  min="0"
                  className="text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  📈 Bunga (% / tahun)
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    value={interestRate || ""}
                    onChange={(e) => setInterestRate(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                    placeholder="6"
                    min="0"
                    max="100"
                    step="0.5"
                    className="text-sm pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  📅 Durasi (tahun)
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    value={projectionYears || ""}
                    onChange={(e) => setProjectionYears(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                    placeholder="10"
                    min="1"
                    max="50"
                    className="text-sm pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    thn
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Chart ─── */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Proyeksi {projectionYears} Tahun
          </h3>
          {projectionData.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Tahun ke-{projectionYears}: <span className="font-semibold text-violet-600 dark:text-violet-400">{fmt(totals.withInterest)}</span>
            </p>
          )}
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            {chartMode === "bar" ? (
              <BarChart data={projectionData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: "Tahun", position: "insideBottomRight", offset: -4, style: { fontSize: 10, fill: "var(--muted-foreground)" } }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => "Rp" + (v / 1000000).toFixed(0) + "jt"}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar
                  dataKey="totalWithoutInterest"
                  name="Tanpa Bunga"
                  fill="var(--muted-foreground)"
                  opacity={0.25}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="totalWithInterest"
                  name="Dengan Bunga"
                  fill="#8b5cf6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            ) : (
              <AreaChart data={projectionData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => "Rp" + (v / 1000000).toFixed(0) + "jt"}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  iconType="circle"
                  iconSize={8}
                />
                <Area
                  type="monotone"
                  dataKey="totalWithoutInterest"
                  name="Tanpa Bunga"
                  stroke="var(--muted-foreground)"
                  fill="var(--muted-foreground)"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="totalWithInterest"
                  name="Dengan Bunga"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.15}
                  strokeWidth={2.5}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Yearly Breakdown Table ─── */}
      <details className="group rounded-2xl border border-border bg-card">
        <summary className="flex cursor-pointer items-center justify-between px-5 py-3 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground">
          📋 Rincian Tahun ke Tahun
          <span className="text-[10px] opacity-60 transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="border-t border-border">
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Tahun</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Tabungan/Bulan</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Tanpa Bunga</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Dengan Bunga</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Bunga</th>
                </tr>
              </thead>
              <tbody>
                {projectionData.map((row) => (
                  <tr
                    key={row.year}
                    className="border-b border-border/50 transition-colors hover:bg-accent/30"
                  >
                    <td className="px-4 py-2.5 font-medium">Tahun ke-{row.year}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                      {fmt(monthlySaving)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {fmt(row.totalWithoutInterest)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-violet-600 dark:text-violet-400">
                      {fmt(row.totalWithInterest)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                      +{fmt(row.interestEarned)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </details>

      {/* ─── Goals Section ─── */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Target size={13} />
            Tujuan Keuangan
          </h3>
        </div>

        {/* Add goal form */}
        <div className="mb-4 flex flex-wrap gap-2">
          <Input
            value={goalName}
            onChange={(e) => setGoalName(e.target.value)}
            placeholder="Nama tujuan (mis: Beli rumah)"
            className="min-w-[180px] flex-1 text-xs"
            onKeyDown={(e) => e.key === "Enter" && addGoal()}
          />
          <Input
            type="number"
            value={goalTarget}
            onChange={(e) => setGoalTarget(e.target.value)}
            placeholder="Target nominal"
            className="w-[140px] text-xs"
            min="0"
            onKeyDown={(e) => e.key === "Enter" && addGoal()}
          />
          <Button
            size="sm"
            onClick={addGoal}
            disabled={!goalName.trim() || !goalTarget}
            className="gap-1 shrink-0"
          >
            <Plus size={13} />
            Tambah
          </Button>
        </div>

        {/* Goal list */}
        <div className="space-y-2">
          {goalResults.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted-foreground">
              Tambahkan tujuan keuangan untuk melihat proyeksi
            </p>
          ) : (
            goalResults.map((goal) => {
              const progress = Math.min(100, Math.round((currentBalance / goal.target) * 100));
              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group rounded-xl border border-border bg-background p-4 transition-colors hover:border-muted-foreground/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{goal.name}</p>
                        {goal.achievable && goal.years <= projectionYears && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                            Tercapai ✅
                          </span>
                        )}
                        {!goal.achievable && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                            Butuh waktu lebih ⏳
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Target: {fmt(goal.target)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeGoal(goal.id)}
                      className="shrink-0 rounded-lg p-1.5 text-muted-foreground/30 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Progres saat ini</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-violet-500 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Projection details */}
                  <div className="mt-3 grid grid-cols-2 gap-4 rounded-lg bg-muted/50 px-3 py-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Waktu tercapai</p>
                      <p className="text-sm font-semibold tabular-nums">
                        {goal.achievable
                          ? goal.years <= 1
                            ? "< 1 tahun"
                            : `~${goal.years} tahun`
                          : "> 50 tahun"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Total tabungan saat tercapai</p>
                      <p className="text-sm font-semibold tabular-nums">
                        {goal.achievable ? fmt(goal.totalSaved) : "—"}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── Tips ─── */}
      <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-500/10 dark:bg-amber-500/5">
        <div className="flex items-start gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
            <Lightbulb size={13} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">💡 Saran Keuangan</p>
            <ul className="mt-1.5 space-y-1">
              {tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400/80">
                  <span>•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
