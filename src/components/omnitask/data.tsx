import { useState, useCallback, createContext, useContext, useEffect } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

// ─── Types ───

export type ActiveTab =
  | "dashboard"
  | "notes"
  | "tasks"
  | "calendar"
  | "finance"
  | "csv"
  | "profile";

export interface Note {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  folder_path: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  due_date: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  wallet_name: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  transaction_date: string;
  created_at: string;
}

export interface SearchResult {
  id: string;
  module: ActiveTab;
  moduleLabel: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  color: string;
}

// ─── Theme Context ───

interface ThemeContextValue {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const s = localStorage.getItem("omnitask-theme");
    if (s === "light" || s === "dark") setTheme(s);
    else
      setTheme(
        window.matchMedia("(prefers-color-scheme:dark)").matches
          ? "dark"
          : "light"
      );
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("omnitask-theme", theme);
  }, [theme, mounted]);

  if (!mounted)
    return <div style={{ visibility: "hidden" }}>{children}</div>;

  return (
    <ThemeContext.Provider
      value={{
        isDark: theme === "dark",
        toggleTheme: () =>
          setTheme((t) => (t === "dark" ? "light" : "dark")),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// ─── Notes Hook ───

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([
    {
      id: "1",
      title: "New Business Idea",
      content: "Building an all-in-one productivity SaaS",
      is_pinned: true,
      folder_path: "/",
      tags: [],
      created_at: "",
      updated_at: "",
    },
    {
      id: "2",
      title: "Shopping List",
      content: "Coffee, milk, rice, soap",
      is_pinned: false,
      folder_path: "/",
      tags: [],
      created_at: "",
      updated_at: "",
    },
    {
      id: "3",
      title: "Meeting Notes",
      content: "Q1 review with the team — aiming for 1000 users next month",
      is_pinned: false,
      folder_path: "/",
      tags: [],
      created_at: "",
      updated_at: "",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const addNote = useCallback(async (title: string, content: string) => {
    const newNote: Note = {
      id: Date.now().toString(),
      title,
      content,
      is_pinned: false,
      folder_path: "/",
      tags: [],
      created_at: "",
      updated_at: "",
    };
    setNotes((p) => [newNote, ...p]);
  }, []);

  const togglePinNote = useCallback(async (id: string, cur: boolean) => {
    setNotes((p) =>
      p.map((n) => (n.id === id ? { ...n, is_pinned: !cur } : n))
    );
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    setNotes((p) => p.filter((n) => n.id !== id));
  }, []);

  return { notes, loading, addNote, togglePinNote, deleteNote };
}

// ─── Tasks Hook ───

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "1",
      title: "Finish UI prototype",
      description: "",
      status: "in_progress",
      priority: "high",
      due_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
      parent_id: null,
      created_at: "",
      updated_at: "",
    },
    {
      id: "2",
      title: "Review financial report",
      description: "",
      status: "todo",
      priority: "medium",
      due_date: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
      parent_id: null,
      created_at: "",
      updated_at: "",
    },
    {
      id: "3",
      title: "Buy domain name",
      description: "",
      status: "done",
      priority: "low",
      due_date: null,
      parent_id: null,
      created_at: "",
      updated_at: "",
    },
    {
      id: "4",
      title: "Install & setup database",
      description: "",
      status: "todo",
      priority: "high",
      due_date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
      parent_id: null,
      created_at: "",
      updated_at: "",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const addTask = useCallback(
    async (
      title: string,
      priority: Task["priority"] = "medium",
      due_date?: string
    ) => {
      const t: Task = {
        id: Date.now().toString(),
        title,
        description: "",
        status: "todo",
        priority,
        due_date: due_date || null,
        parent_id: null,
        created_at: "",
        updated_at: "",
      };
      setTasks((p) => [t, ...p]);
    },
    []
  );

  const updateTaskStatus = useCallback(
    async (id: string, status: Task["status"]) => {
      setTasks((p) =>
        p.map((t) => (t.id === id ? { ...t, status } : t))
      );
    },
    []
  );

  const deleteTask = useCallback(async (id: string) => {
    setTasks((p) => p.filter((t) => t.id !== id));
  }, []);

  return { tasks, loading, addTask, updateTaskStatus, deleteTask };
}

// ─── Transactions Hook ───

export function useTransactions() {
  const [tx, setTx] = useState<Transaction[]>([
    {
      id: "1",
      wallet_name: "Cash",
      type: "income",
      amount: 15000000,
      category: "Salary",
      description: "Monthly transfer",
      transaction_date: new Date().toISOString().split("T")[0],
      created_at: "",
    },
    {
      id: "2",
      wallet_name: "Cash",
      type: "expense",
      amount: 450000,
      category: "Entertainment",
      description: "Netflix & Spotify",
      transaction_date: new Date().toISOString().split("T")[0],
      created_at: "",
    },
    {
      id: "3",
      wallet_name: "Cash",
      type: "expense",
      amount: 1200000,
      category: "Food",
      description: "Family dinner",
      transaction_date: new Date().toISOString().split("T")[0],
      created_at: "",
    },
    {
      id: "4",
      wallet_name: "Cash",
      type: "expense",
      amount: 250000,
      category: "Transport",
      description: "Weekly gas",
      transaction_date: new Date().toISOString().split("T")[0],
      created_at: "",
    },
    {
      id: "5",
      wallet_name: "Cash",
      type: "income",
      amount: 500000,
      category: "Freelance",
      description: "Logo design",
      transaction_date: new Date().toISOString().split("T")[0],
      created_at: "",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const addTransaction = useCallback(
    async (
      type: "income" | "expense",
      amount: number,
      category: string,
      description: string = ""
    ) => {
      const t: Transaction = {
        id: Date.now().toString(),
        wallet_name: "Cash",
        type,
        amount,
        category,
        description,
        transaction_date: new Date().toISOString().split("T")[0],
        created_at: "",
      };
      setTx((p) => [t, ...p]);
    },
    []
  );

  const deleteTransaction = useCallback(async (id: string) => {
    setTx((p) => p.filter((t) => t.id !== id));
  }, []);

  const totalIncome = tx
    .filter((t) => t.type === "income")
    .reduce((a, t) => a + Number(t.amount), 0);

  const totalExpense = tx
    .filter((t) => t.type === "expense")
    .reduce((a, t) => a + Number(t.amount), 0);

  return {
    transactions: tx,
    loading,
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    addTransaction,
    deleteTransaction,
  };
}


