import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Edit3,
  Check,
  X,
} from "lucide-react";
import type { Transaction } from "./data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePickerPopover } from "@/components/ui/date-picker-popover";
import { ExpenseChart } from "./ExpenseChart";

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
  updateTransaction?: (id: string, data: { type?: "income" | "expense"; amount?: number; category?: string; description?: string; transaction_date?: string }) => Promise<void>;
}

const CATEGORIES = [
  "Salary",
  "Freelance",
  "Investment",
  "Food",
  "Transport",
  "Entertainment",
  "Shopping",
  "Bills",
  "Health",
  "Education",
  "Other",
];

// ─── Edit Transaction Modal ───

function EditTransactionModal({
  transaction,
  onSave,
  onClose,
}: {
  transaction: Transaction;
  onSave: (id: string, data: { type: "income" | "expense"; amount: number; category: string; description: string; transaction_date: string }) => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<"income" | "expense">(transaction.type);
  const [amount, setAmount] = useState(String(transaction.amount));
  const [category, setCategory] = useState(transaction.category);
  const [description, setDescription] = useState(transaction.description);
  const [transactionDate, setTransactionDate] = useState(transaction.transaction_date);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
    onSave(transaction.id, {
      type,
      amount: Number(amount),
      category,
      description,
      transaction_date: transactionDate,
    });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl"
        >
          <form onSubmit={handleSave} className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Edit Transaction</h3>
              <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-accent">
                <X size={15} />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  type === "expense"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setType("income")}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  type === "income"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                Income
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Amount (IDR)</label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Description</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What was this for?"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Date</label>
              <DatePickerPopover
                value={transactionDate}
                onChange={(d) => setTransactionDate(d || new Date().toISOString().split("T")[0])}
                placeholder="Select date"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" size="sm" className="gap-1">
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

// ─── Main FinanceView ───

export function FinanceView({
  transactions,
  totalIncome,
  totalExpense,
  balance,
  addTransaction,
  deleteTransaction,
  updateTransaction,
}: FinanceViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Other");
  const [description, setDescription] = useState("");
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
    await addTransaction(type, Number(amount), category, description);
    setAmount("");
    setDescription("");
    setCategory("Other");
    setShowForm(false);
  };

  const handleEditSave = (id: string, data: { type: "income" | "expense"; amount: number; category: string; description: string; transaction_date: string }) => {
    updateTransaction?.(id, data);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-6xl space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Finance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          size="sm"
          className="gap-1.5"
        >
          <Plus size={15} />
          Add Transaction
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <ArrowUpRight size={16} className="text-emerald-500" />
            <span className="text-xs text-muted-foreground">Income</span>
          </div>
          <p className="mt-2 text-lg font-semibold text-emerald-600 tabular-nums">
            Rp {totalIncome.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <ArrowDownRight size={16} className="text-destructive" />
            <span className="text-xs text-muted-foreground">Expenses</span>
          </div>
          <p className="mt-2 text-lg font-semibold tabular-nums">
            Rp {totalExpense.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <span className="text-xs text-muted-foreground">Balance</span>
          <p
            className={`mt-2 text-lg font-semibold tabular-nums ${
              balance >= 0 ? "text-emerald-600" : "text-destructive"
            }`}
          >
            Rp {balance.toLocaleString("id-ID")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Transaction list */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-5 py-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Transactions
              </h3>
            </div>
            <div className="divide-y divide-border">
              {transactions.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No transactions yet
                </div>
              ) : (
                transactions.map((t) => (
                  <div
                    key={t.id}
                    className="group flex items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-accent/50"
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        t.type === "income"
                          ? "bg-emerald-500"
                          : "bg-destructive"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{t.category}</p>
                      {t.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {t.description}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {t.transaction_date}
                    </span>
                    <span
                      className={`shrink-0 font-medium tabular-nums ${
                        t.type === "income"
                          ? "text-emerald-600"
                          : ""
                      }`}
                    >
                      {t.type === "income" ? "+" : "-"}Rp{" "}
                      {Number(t.amount).toLocaleString("id-ID")}
                    </span>
                    {/* Edit button */}
                    {updateTransaction && (
                      <button
                        onClick={() => setEditingTx(t)}
                        className="shrink-0 rounded p-1 text-muted-foreground/40 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                        title="Edit transaction"
                      >
                        <Edit3 size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteTransaction(t.id)}
                      className="shrink-0 rounded p-1 text-muted-foreground/40 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                      title="Delete transaction"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Expense chart */}
        <div>
          <ExpenseChart transactions={transactions} />
        </div>
      </div>

      {/* Add transaction form */}
      {showForm && (
        <motion.form
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleAdd}
          className="rounded-lg border border-border bg-card p-5"
        >
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => setType("expense")}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                type === "expense"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                type === "income"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              Income
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Amount (IDR)
              </label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min="0"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-muted-foreground">
                Description (optional)
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What was this for?"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="submit" size="sm">
              Add
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </motion.form>
      )}

      {/* Edit modal */}
      {editingTx && (
        <EditTransactionModal
          transaction={editingTx}
          onSave={handleEditSave}
          onClose={() => setEditingTx(null)}
        />
      )}
    </motion.div>
  );
}
