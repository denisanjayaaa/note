import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Sparkles,
  ChefHat,
  Fuel,
  ShoppingCart,
  Zap,
  Heart,
  GraduationCap,
  Briefcase,
  MoreHorizontal,
  Repeat,
  PiggyBank,
} from "lucide-react";
import type { Transaction } from "./data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SavingsProjection } from "./SavingsProjection";

interface FinanceViewProps {
  transactions: Transaction[];
  totalIncome: number;
  totalExpense: number;
  balance: number;
  addTransaction: (
    type: "income" | "expense",
    amount: number,
    category: string,
    description?: string
  ) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  updateTransaction?: (
    id: string,
    data: {
      type?: "income" | "expense";
      amount?: number;
      category?: string;
      description?: string;
      transaction_date?: string;
    }
  ) => Promise<void>;
}

// ─── Emoji / Icon map per category ───

const CATEGORY_CONFIG: Record<
  string,
  { emoji: string; icon: typeof ChefHat; color: string }
> = {
  Food: { emoji: "🍔", icon: ChefHat, color: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400" },
  Transport: { emoji: "⛽", icon: Fuel, color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400" },
  Shopping: { emoji: "🛍️", icon: ShoppingCart, color: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-400" },
  Bills: { emoji: "⚡", icon: Zap, color: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" },
  Health: { emoji: "❤️", icon: Heart, color: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400" },
  Education: { emoji: "🎓", icon: GraduationCap, color: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400" },
  Salary: { emoji: "💰", icon: Briefcase, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" },
  Freelance: { emoji: "💼", icon: Briefcase, color: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400" },
  Investment: { emoji: "📈", icon: PiggyBank, color: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400" },
  Entertainment: { emoji: "🎬", icon: Repeat, color: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400" },
  Other: { emoji: "📦", icon: MoreHorizontal, color: "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-400" },
};

function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG[category] || CATEGORY_CONFIG.Other;
}

// ─── Quick Categories for buttons ───

const QUICK_CATEGORIES = [
  { label: "Makan", category: "Food", emoji: "🍔" },
  { label: "Bensin", category: "Transport", emoji: "⛽" },
  { label: "Belanja", category: "Shopping", emoji: "🛍️" },
  { label: "Tagihan", category: "Bills", emoji: "⚡" },
  { label: "Kesehatan", category: "Health", emoji: "❤️" },
  { label: "Gaji", category: "Salary", emoji: "💰", income: true },
];

const QUICK_EXPENSE_CATEGORIES = [
  { label: "Makan", category: "Food", emoji: "🍔" },
  { label: "Bensin", category: "Transport", emoji: "⛽" },
  { label: "Belanja", category: "Shopping", emoji: "🛍️" },
  { label: "Tagihan", category: "Bills", emoji: "⚡" },
  { label: "Kesehatan", category: "Health", emoji: "❤️" },
  { label: "Lainnya", category: "Other", emoji: "📦" },
];

const QUICK_AMOUNTS = [10000, 25000, 50000, 100000, 500000, 1000000];

// ─── Simple inline parser for Indonesian finance text ───

function parseFinanceInput(text: string): {
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
} | null {
  const lower = text.toLowerCase().trim();
  if (!lower) return null;

  // Detect amount patterns: "15rb", "15k", "15.000", "15 ribu", "2jt", "2 juta", "15000"
  const amountPatterns = [
    /(\d+(?:[.,]\d+)?)\s*(jt|juta|million?)/i,
    /(\d+(?:[.,]\d+)?)\s*(rb|ribu|k|k\b)/i,
    /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?)\s*(jt|juta|rb|ribu|k)?/i,
    /(\d+)[\s]*(?:ribu|rb|k|jt|juta)/i,
    /(\d+)/,
  ];

  let amount = 0;
  let amountText = "";

  for (const pattern of amountPatterns) {
    const match = lower.match(pattern);
    if (match) {
      const raw = match[1].replace(/[,.]/g, "");
      const multiplier = (match[2] || "").toLowerCase();
      let val = parseInt(raw, 10);

      if (multiplier === "jt" || multiplier === "juta" || multiplier === "million") {
        val *= 1000000;
      } else if (multiplier === "rb" || multiplier === "ribu" || multiplier === "k") {
        val *= 1000;
      }

      if (val > 0) {
        amount = val;
        amountText = match[0];
        break;
      }
    }
  }

  if (amount === 0) return null;

  // Determine income vs expense
  const incomeWords = [
    "gaji", "salary", "pemasukan", "income", "bonus", "honor",
    "fee", "pendapatan", "transfer", "masuk", "dapet", "dapat",
    "terima", "diberi", "dikasih", "rejeki", "rezeki",
  ];
  const expenseWords = [
    "beli", "bayar", "makan", "minum", "pengeluaran", "expense",
    "cost", "biaya", "ongkos", "sewa", "tagihan", "bill",
    "bensin", "transport", "grab", "gojek", "ojek", "taxi",
    "belanja", "baju", "sepatu", "obat", "pln", "pdam", "pulsa",
    "kuota", "internet", "netflix", "spotify",
  ];

  // Check for income indicators
  const isIncome = incomeWords.some((w) => lower.includes(w));
  // Check for expense indicators
  const isExpense = expenseWords.some((w) => lower.includes(w));

  // Determine type
  let type: "income" | "expense";
  if (isIncome && !isExpense) {
    type = "income";
  } else if (isExpense && !isIncome) {
    type = "expense";
  } else {
    // Default: if it has income words, it's income; otherwise expense
    type = isIncome ? "income" : "expense";
  }

  // Detect category
  const categoryKeywords: Record<string, string[]> = {
    Food: ["makan", "minum", "restaurant", "cafe", "lunch", "dinner", "groceries", "grocery", "mart", "supermarket", "kopi", "teh", "jus", "nasi", "ayam", "sate", "bakso", "mie", "soto"],
    Transport: ["transport", "gas", "bensin", "fuel", "grab", "gojek", "ojek", "taxi", "parkir", "parking", "bensin", "taksi", "bus", "kereta"],
    Shopping: ["shopping", "belanja", "clothes", "baju", "sepatu", "shoes", "bag", "tas", "celana", "aksesoris"],
    Bills: ["bill", "tagihan", "electricity", "listrik", "water", "air", "phone", "internet", "pdam", "pln", "pulsa", "kuota"],
    Health: ["health", "kesehatan", "doctor", "dokter", "obat", "medicine", "hospital", "klinik", "rs", "sakit", "vitamin"],
    Education: ["education", "course", "kursus", "buku", "book", "tutorial", "class", "kuliah", "sekolah", "les"],
    Salary: ["gaji", "salary", "payroll", "upah", "honor"],
    Freelance: ["freelance", "project", "client", "gig", "designer"],
    Entertainment: ["entertainment", "game", "movie", "film", "music", "ticket", "nonton", "netflix", "spotify", "bioskop"],
  };

  let category = "Other";
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      category = cat;
      break;
    }
  }

  // Clean description: remove amount text from description
  let description = text.trim();
  if (amountText) {
    description = description.replace(new RegExp(amountText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "").trim();
    // Also clean trailing/leading whitespace/punctuation
    description = description.replace(/^[\s,.\-;:]+|[\s,.\-;:]+$/g, "").trim();
  }

  if (!description) {
    description = type === "income" ? "Pemasukan" : "Pengeluaran";
  }

  return { type, amount, category, description };
}

// ─── Main Simplified Finance View ───

type FinanceSection = "dompet" | "rencana";

export function FinanceView({
  transactions,
  totalIncome,
  totalExpense,
  balance,
  addTransaction,
  deleteTransaction,
  updateTransaction,
}: FinanceViewProps) {
  const [section, setSection] = useState<FinanceSection>("dompet");
  const [activeTab, setActiveTab] = useState<"semua" | "pemasukan" | "pengeluaran">("semua");
  const [quickInput, setQuickInput] = useState("");
  const [showQuickForm, setShowQuickForm] = useState(false);
  const [showQuickAmounts, setShowQuickAmounts] = useState(false);
  const [quickType, setQuickType] = useState<"expense" | "income">("expense");
  const [quickAmount, setQuickAmount] = useState("");
  const [quickCategory, setQuickCategory] = useState("Other");
  const [quickDescription, setQuickDescription] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Focus input when form opens
  useEffect(() => {
    if (showQuickForm) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [showQuickForm]);

  // Filter transactions by tab
  const filteredTransactions = useMemo(() => {
    if (activeTab === "pemasukan") return transactions.filter((t) => t.type === "income");
    if (activeTab === "pengeluaran") return transactions.filter((t) => t.type === "expense");
    return transactions;
  }, [transactions, activeTab]);

  // Group by date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    filteredTransactions.forEach((t) => {
      const date = t.transaction_date || today;
      if (!groups[date]) groups[date] = [];
      groups[date].push(t);
    });

    // Sort groups by date descending
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => {
        let label = date;
        if (date === today) label = "Hari Ini";
        else if (date === yesterday) label = "Kemarin";
        else {
          const d = new Date(date + "T00:00:00");
          const months = [
            "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
            "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
          ];
          label = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
        }
        return { date, label, items };
      });
  }, [filteredTransactions]);

  // ─── Handle quick natural input ───

  const handleQuickInput = async () => {
    if (!quickInput.trim() || isProcessing) return;
    setIsProcessing(true);

    try {
      const parsed = parseFinanceInput(quickInput);
      if (parsed) {
        await addTransaction(parsed.type, parsed.amount, parsed.category, parsed.description);
        setQuickInput("");
        setShowQuickForm(false);
      } else {
        // If can't parse, open quick form pre-filled
        setQuickDescription(quickInput);
        setShowQuickAmounts(true);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── Handle quick amount + category add ───

  const handleQuickAdd = async (amount: number, category: string, type: "income" | "expense") => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await addTransaction(type, amount, category, "");
      setShowQuickForm(false);
      setQuickInput("");
      setQuickAmount("");
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── Enter key handler ───

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleQuickInput();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-3xl space-y-5"
    >
      {/* ─── Section Tab Bar ─── */}
      <div className="flex gap-1 rounded-xl bg-muted p-1">
        <button
          onClick={() => setSection("dompet")}
          className={`flex items-center justify-center gap-1.5 flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
            section === "dompet"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Wallet size={14} />
          Dompet
        </button>
        <button
          onClick={() => setSection("rencana")}
          className={`flex items-center justify-center gap-1.5 flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
            section === "rencana"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <TrendingUp size={14} />
          Rencana Tabungan
        </button>
      </div>

      {section === "rencana" ? (
        <SavingsProjection
          transactions={transactions}
          balance={balance}
          totalIncome={totalIncome}
          totalExpense={totalExpense}
        />
      ) : (
        <>
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
            <Wallet size={16} />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Dompet</h1>
            <p className="text-xs text-muted-foreground">
              {transactions.length} transaksi
            </p>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setShowQuickForm(!showQuickForm);
            setShowQuickAmounts(false);
          }}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
            showQuickForm
              ? "bg-muted text-muted-foreground"
              : "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 hover:shadow-md"
          }`}
        >
          {showQuickForm ? (
            <>
              <Plus size={15} className="rotate-45" />
              Tutup
            </>
          ) : (
            <>
              <Plus size={15} />
              Catat
            </>
          )}
        </motion.button>
      </div>

      {/* ─── Saldo Card ─── */}
      <motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 text-white shadow-lg"
      >
        {/* Pattern overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-5">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white" />
          <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-white" />
        </div>

        <div className="relative">
          <p className="text-sm font-medium text-emerald-100/80">Saldo</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">
            Rp {balance.toLocaleString("id-ID")}
          </p>
          <div className="mt-4 flex gap-4">
            <div className="flex items-center gap-1.5">
              <ArrowUpRight size={14} className="text-emerald-200" />
              <span className="text-xs text-emerald-100/90">
                Pemasukan Rp {totalIncome.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowDownRight size={14} className="text-red-200" />
              <span className="text-xs text-emerald-100/90">
                Pengeluaran Rp {totalExpense.toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── Quick Add Form ─── */}
      <AnimatePresence>
        {showQuickForm && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            {/* Natural input */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Ketik aja — paham kok bahasa Indonesia 😊
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    ref={inputRef}
                    value={quickInput}
                    onChange={(e) => setQuickInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder='Contoh: "makan siang 25rb" atau "gaji 15jt"'
                    className="pr-10"
                    disabled={isProcessing}
                  />
                  <Sparkles
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40"
                  />
                </div>
                <Button
                  onClick={handleQuickInput}
                  disabled={!quickInput.trim() || isProcessing}
                  size="sm"
                  className="shrink-0 gap-1"
                >
                  {isProcessing ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-background/20 border-t-background" />
                  ) : (
                    <Plus size={14} />
                  )}
                  Tambah
                </Button>
              </div>
              {/* Preview parsed result */}
              {quickInput.trim() && parseFinanceInput(quickInput) && (
                <PreviewParsed text={quickInput} />
              )}
            </div>

            {/* Quick amount buttons */}
            <div className="mb-4">
              <p className="mb-2 text-xs text-muted-foreground">Pilih nominal:</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_AMOUNTS.map((amount) => (
                  <motion.button
                    key={amount}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setQuickAmount(String(amount));
                      setShowQuickAmounts(true);
                    }}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                      Number(quickAmount) === amount
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : "border-border text-muted-foreground hover:border-muted-foreground/30"
                    }`}
                  >
                    Rp {amount.toLocaleString("id-ID")}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Quick category buttons (for expense defaults) */}
            <div>
              <p className="mb-2 text-xs text-muted-foreground">Pilih kategori:</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_EXPENSE_CATEGORIES.map((cat) => (
                  <motion.button
                    key={cat.category}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      const amt = Number(quickAmount) || 25000;
                      handleQuickAdd(amt, cat.category, "expense");
                    }}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-medium text-muted-foreground transition-all hover:border-muted-foreground/30 hover:bg-accent hover:text-foreground"
                  >
                    <span className="text-sm">{cat.emoji}</span>
                    {cat.label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Manual entry if quick amount selected */}
            {showQuickAmounts && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-4 border-t border-border pt-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Jenis</label>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setQuickType("expense")}
                        className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                          quickType === "expense"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        💸 Pengeluaran
                      </button>
                      <button
                        onClick={() => setQuickType("income")}
                        className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                          quickType === "income"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        💰 Pemasukan
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Kategori</label>
                    <select
                      value={quickCategory}
                      onChange={(e) => setQuickCategory(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs shadow-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
                    >
                      {Object.keys(CATEGORY_CONFIG).map((c) => (
                        <option key={c} value={c}>
                          {CATEGORY_CONFIG[c].emoji} {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Deskripsi (opsional)
                  </label>
                  <Input
                    value={quickDescription}
                    onChange={(e) => setQuickDescription(e.target.value)}
                    placeholder="Mis: Makan siang di warteg"
                    className="text-xs"
                  />
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      const amt = Number(quickAmount) || 0;
                      if (amt <= 0) return;
                      handleQuickAdd(amt, quickCategory, quickType);
                    }}
                    disabled={!quickAmount || Number(quickAmount) <= 0 || isProcessing}
                    className="gap-1"
                  >
                    {isProcessing ? (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-background/20 border-t-background" />
                    ) : (
                      <Plus size={14} />
                    )}
                    Tambah Rp {Number(quickAmount).toLocaleString("id-ID")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowQuickAmounts(false)}
                  >
                    Batal
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Tab Filter ─── */}
      {transactions.length > 0 && (
        <div className="flex gap-1 rounded-xl bg-muted p-1">
          {(["semua", "pemasukan", "pengeluaran"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === tab
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "semua" ? "Semua" : tab === "pemasukan" ? "💰 Pemasukan" : "💸 Pengeluaran"}
            </button>
          ))}
        </div>
      )}

      {/* ─── Transaction List ─── */}
      <div className="rounded-2xl border border-border bg-card">
        {transactions.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
              <Wallet size={22} className="text-muted-foreground/60" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              Belum ada transaksi
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Klik "Catat" untuk menambahkan pemasukan atau pengeluaran
            </p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            Tidak ada transaksi {activeTab === "pemasukan" ? "pemasukan" : "pengeluaran"}
          </div>
        ) : (
          <div>
            {groupedTransactions.map((group) => (
              <div key={group.date}>
                {/* Date header */}
                <div className="border-b border-border bg-muted/30 px-5 py-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    {group.label}
                  </p>
                </div>
                {/* Items */}
                {group.items.map((t) => {
                  const cfg = getCategoryConfig(t.category);
                  return (
                    <div
                      key={t.id}
                      className="group flex items-center gap-3 border-b border-border/50 px-5 py-3 text-sm transition-colors last:border-b-0 hover:bg-accent/30"
                    >
                      {/* Emoji icon */}
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base ${cfg.color}`}
                      >
                        {cfg.emoji}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {t.description || t.category}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {t.category}
                        </p>
                      </div>

                      {/* Amount */}
                      <div className="shrink-0 text-right">
                        <p
                          className={`font-semibold tabular-nums ${
                            t.type === "income"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-foreground"
                          }`}
                        >
                          {t.type === "income" ? "+" : "-"}Rp{" "}
                          {Number(t.amount).toLocaleString("id-ID")}
                        </p>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => deleteTransaction(t.id)}
                        className="shrink-0 rounded-lg p-1.5 text-muted-foreground/30 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                        title="Hapus"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
        </>
      )}
    </motion.div>
  );
}

// ─── Preview Parsed Result ───

function PreviewParsed({ text }: { text: string }) {
  const parsed = parseFinanceInput(text);
  if (!parsed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-2 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2 dark:border-emerald-500/10 dark:bg-emerald-500/5"
    >
      <div className="flex items-center gap-2 text-xs">
        <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
          {parsed.type === "income" ? "💸 Pemasukan" : "💸 Pengeluaran"}
        </span>
        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
          Rp {parsed.amount.toLocaleString("id-ID")}
        </span>
        <span className="text-muted-foreground">•</span>
        <span className="text-muted-foreground">{parsed.category}</span>
        {parsed.description && (
          <>
            <span className="text-muted-foreground">•</span>
            <span className="truncate text-muted-foreground">{parsed.description}</span>
          </>
        )}
      </div>
    </motion.div>
  );
}
