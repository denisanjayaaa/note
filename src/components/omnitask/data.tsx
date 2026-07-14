import { useState, useCallback, createContext, useContext, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

// ─── Types ───

export type ActiveTab =
  | "dashboard"
  | "notes"
  | "tasks"
  | "calendar"
  | "finance"
  | "csv"
  | "profile"
  | "habits"
  | "code";

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

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface TaskCategory {
  id: string;
  label: string;
  color: string;
  dot: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: "low" | "medium" | "high";
  due_date: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  tags: string[];
  subtasks: Subtask[];
  is_pinned: boolean;
  order: number;
}

export interface Habit {
  id: string;
  name: string;
  color: string;
  icon: string;
  logs: { date: string; done: boolean; note?: string }[];
  streak: number;
  longest_streak: number;
  created_at: string;
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
  _matchField?: string;
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

// Safe localStorage wrapper that doesn't throw in sandboxed iframes
function safeLocalStorage() {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storage = safeLocalStorage();
    let saved: string | null = null;
    if (storage) {
      try { saved = storage.getItem("omnitask-theme"); } catch {}
    }
    if (saved === "light" || saved === "dark") setTheme(saved);
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
    const storage = safeLocalStorage();
    if (storage) {
      try { storage.setItem("omnitask-theme", theme); } catch {}
    }
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

// ─── Category Colors ───

export const CATEGORY_COLORS = [
  { color: "border-t-sky-500", dot: "bg-sky-500" },
  { color: "border-t-amber-500", dot: "bg-amber-500" },
  { color: "border-t-emerald-500", dot: "bg-emerald-500" },
  { color: "border-t-violet-500", dot: "bg-violet-500" },
  { color: "border-t-rose-500", dot: "bg-rose-500" },
  { color: "border-t-cyan-500", dot: "bg-cyan-500" },
  { color: "border-t-orange-500", dot: "bg-orange-500" },
  { color: "border-t-teal-500", dot: "bg-teal-500" },
  { color: "border-t-pink-500", dot: "bg-pink-500" },
  { color: "border-t-lime-500", dot: "bg-lime-500" },
  { color: "border-t-indigo-500", dot: "bg-indigo-500" },
];

// ─── Helpers ───

function toDateString(ts: number): string {
  return new Date(ts).toISOString();
}

// ─── Tasks Hook ───

export function useTasks() {
  const tasksData = useQuery(api.tasks.list);
  const addTaskMut = useMutation(api.tasks.add);
  const updateStatusMut = useMutation(api.tasks.updateStatus);
  const deleteTaskMut = useMutation(api.tasks.remove);
  const addSubtaskMut = useMutation(api.tasks.addSubtask);
  const toggleSubtaskMut = useMutation(api.tasks.toggleSubtask);
  const updateTagsMut = useMutation(api.tasks.updateTags);
  const updateTaskMut = useMutation(api.tasks.update);
  const togglePinMut = useMutation(api.tasks.togglePin);
  const reorderMut = useMutation(api.tasks.reorder);

  // Transform Convex docs to frontend Task type
  const tasks = useMemo(() => {
    if (!tasksData) return [];
    return tasksData.map((doc) => ({
      id: doc._id,
      title: doc.title,
      description: doc.description,
      status: doc.status,
      priority: doc.priority,
      due_date: doc.due_date ?? null,
      parent_id: doc.parent_id ?? null,
      created_at: toDateString(doc._creationTime),
      updated_at: doc.updated_at ?? "",
      tags: doc.tags,
      subtasks: doc.subtasks,
      is_pinned: doc.is_pinned,
      order: doc.order,
    })) as Task[];
  }, [tasksData]);

  const loading = tasksData === undefined;

  // ─── Categories / Columns (client-side only) ───

  const [categories, setCategories] = useState<TaskCategory[]>([
    { id: "todo", label: "To Do", color: "border-t-sky-500", dot: "bg-sky-500" },
    { id: "in_progress", label: "In Progress", color: "border-t-amber-500", dot: "bg-amber-500" },
    { id: "done", label: "Done", color: "border-t-emerald-500", dot: "bg-emerald-500" },
  ]);

  const addCategory = useCallback(async (label: string, colorIndex?: number) => {
    const id = label.toLowerCase().replace(/\s+/g, "_");
    if (categories.some((c) => c.id === id)) return;
    const ci = colorIndex ?? categories.length % CATEGORY_COLORS.length;
    const picked = CATEGORY_COLORS[ci % CATEGORY_COLORS.length];
    setCategories((prev) => [...prev, { id, label, ...picked }]);
  }, [categories]);

  const updateCategoryColor = useCallback(async (id: string, colorIndex: number) => {
    const picked = CATEGORY_COLORS[colorIndex % CATEGORY_COLORS.length];
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...picked } : c))
    );
  }, []);

  const updateCategory = useCallback(async (id: string, label: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, label } : c))
    );
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    if (categories.length <= 1) return;
    const firstOther = categories.find((c) => c.id !== id);
    setTasksLocal((prev) =>
      prev.map((t) => (t.status === id ? { ...t, status: firstOther?.id || "todo" } : t))
    );
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, [categories]);

  const reorderCategory = useCallback(async (fromIndex: number, toIndex: number) => {
    setCategories((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  }, []);

  // We need a local copy of tasks for category deletion fallback
  const [tasksLocal, setTasksLocal] = useState<Task[]>([]);
  useEffect(() => { setTasksLocal(tasks); }, [tasks]);

  const addTask = useCallback(
    async (
      title: string,
      priority: Task["priority"] = "medium",
      due_date?: string,
      status: string = "todo",
      description?: string
    ) => {
      try {
        await addTaskMut({
          title,
          priority,
          due_date: due_date || undefined,
          status: status as "todo" | "in_progress" | "done",
          description: description || undefined,
        });
      } catch (err: any) {
        // If the deployed backend has an older validator (without status/description fields),
        // retry without those fields.
        if (
          err?.message?.includes("extra field") ||
          err?.message?.includes("not in the validator") ||
          err?.data?.message?.includes("extra field")
        ) {
          await addTaskMut({
            title,
            priority,
            due_date: due_date || undefined,
          });
        } else {
          throw err; // Re-throw non-validation errors
        }
      }
    },
    [addTaskMut]
  );

  const addSubtask = useCallback(async (taskId: string, title: string) => {
    await addSubtaskMut({ id: taskId as Id<"tasks">, title });
  }, [addSubtaskMut]);

  const toggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const sub = task.subtasks.find((s) => s.id === subtaskId);
    if (!sub) return;
    await toggleSubtaskMut({ id: taskId as Id<"tasks">, subtaskId, done: !sub.done });
  }, [tasks, toggleSubtaskMut]);

  const updateTaskStatus = useCallback(
    async (id: string, status: string) => {
      await updateStatusMut({
        id: id as Id<"tasks">,
        status: status as "todo" | "in_progress" | "done",
      });
    },
    [updateStatusMut]
  );

  const deleteTask = useCallback(async (id: string) => {
    await deleteTaskMut({ id: id as Id<"tasks"> });
  }, [deleteTaskMut]);

  const updateTags = useCallback(async (taskId: string, tags: string[]) => {
    await updateTagsMut({ id: taskId as Id<"tasks">, tags });
  }, [updateTagsMut]);

  const updateTask = useCallback(
    async (
      id: string,
      data: { title?: string; priority?: Task["priority"]; due_date?: string | null; description?: string }
    ) => {
      await updateTaskMut({
        id: id as Id<"tasks">,
        title: data.title,
        priority: data.priority,
        due_date: data.due_date !== undefined ? data.due_date : undefined,
        description: data.description,
      });
    },
    [updateTaskMut]
  );

  const togglePinTask = useCallback(async (taskId: string) => {
    await togglePinMut({ id: taskId as Id<"tasks"> });
  }, [togglePinMut]);

  const reorderTask = useCallback(async (taskId: string, newOrder: number) => {
    await reorderMut({ id: taskId as Id<"tasks">, order: newOrder });
  }, [reorderMut]);

  // Sort helper: pinned first → high→medium→low → by order
  const sortTasks = useCallback((tasksToSort: Task[]): Task[] => {
    const priorityWeight = { high: 0, medium: 1, low: 2 };
    return [...tasksToSort].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      const pw = priorityWeight[a.priority] - priorityWeight[b.priority];
      if (pw !== 0) return pw;
      return a.order - b.order;
    });
  }, []);

  return {
    tasks,
    loading,
    categories,
    addCategory,
    updateCategory,
    updateCategoryColor,
    deleteCategory,
    reorderCategory,
    addTask,
    updateTaskStatus,
    deleteTask,
    addSubtask,
    toggleSubtask,
    updateTags,
    updateTask,
    togglePinTask,
    reorderTask,
    sortTasks,
  };
}

// ─── Notes Hook ───

export function useNotes() {
  const notesData = useQuery(api.notes.list);
  const addNoteMut = useMutation(api.notes.add);
  const togglePinNoteMut = useMutation(api.notes.togglePin);
  const deleteNoteMut = useMutation(api.notes.remove);
  const updateNoteMut = useMutation(api.notes.update);
  const updateFolderMut = useMutation(api.notes.updateFolder);

  // Transform Convex docs to frontend Note type
  const notes = useMemo(() => {
    if (!notesData) return [];
    return notesData.map((doc) => ({
      id: doc._id,
      title: doc.title,
      content: doc.content,
      is_pinned: doc.is_pinned,
      folder_path: doc.folder_path,
      tags: doc.tags,
      created_at: toDateString(doc._creationTime),
      updated_at: doc.updated_at ?? "",
    })) as Note[];
  }, [notesData]);

  const loading = notesData === undefined;

  // ─── Folders (derived from notes + defaults) ───
  const folders = useMemo(() => {
    const folderSet = new Set<string>();
    folderSet.add("/");
    notes.forEach((n) => {
      if (n.folder_path && n.folder_path !== "/") folderSet.add(n.folder_path);
    });
    return Array.from(folderSet).sort();
  }, [notes]);

  const addNote = useCallback(async (title: string, content: string, folder_path?: string) => {
    await addNoteMut({ title, content, folder_path });
  }, [addNoteMut]);

  const togglePinNote = useCallback(async (id: string, cur: boolean) => {
    await togglePinNoteMut({ id: id as Id<"notes">, is_pinned: cur });
  }, [togglePinNoteMut]);

  const deleteNote = useCallback(async (id: string) => {
    await deleteNoteMut({ id: id as Id<"notes"> });
  }, [deleteNoteMut]);

  const updateNote = useCallback(async (id: string, title: string, content: string) => {
    await updateNoteMut({ id: id as Id<"notes">, title, content });
  }, [updateNoteMut]);

  // ─── Folder Management (client-side only for existence, server-side for note moves) ───
  const [extraFolders, setExtraFolders] = useState<string[]>(["Work", "Personal", "Ideas"]);

  const addFolder = useCallback(async (name: string) => {
    setExtraFolders((p) => (p.includes(name) ? p : [...p, name]));
  }, []);

  const renameFolder = useCallback(async (oldName: string, newName: string) => {
    // Move all notes from old folder to new folder via Convex
    const notesToMove = notes.filter((n) => n.folder_path === oldName);
    await Promise.all(notesToMove.map((n) => updateFolderMut({ id: n.id as Id<"notes">, folder_path: newName })));
    setExtraFolders((p) => p.map((f) => (f === oldName ? newName : f)));
  }, [notes, updateFolderMut]);

  const deleteFolder = useCallback(async (name: string) => {
    if (name === "/") return;
    // Move all notes from this folder to root
    const notesToMove = notes.filter((n) => n.folder_path === name);
    await Promise.all(notesToMove.map((n) => updateFolderMut({ id: n.id as Id<"notes">, folder_path: "/" })));
    setExtraFolders((p) => p.filter((f) => f !== name));
  }, [notes, updateFolderMut]);

  const moveNoteToFolder = useCallback(async (noteId: string, folder: string) => {
    await updateFolderMut({ id: noteId as Id<"notes">, folder_path: folder });
  }, [updateFolderMut]);

  // Combined folders list
  const allFolders = useMemo(() => {
    const combined = new Set([...folders, ...extraFolders]);
    return Array.from(combined).sort();
  }, [folders, extraFolders]);

  return { notes, loading, folders: allFolders, addNote, togglePinNote, deleteNote, updateNote, addFolder, renameFolder, deleteFolder, moveNoteToFolder };
}

// ─── Transactions Hook ───

export function useTransactions() {
  const txData = useQuery(api.transactions.list);
  const addTxMut = useMutation(api.transactions.add);
  const deleteTxMut = useMutation(api.transactions.remove);
  const updateTxMut = useMutation(api.transactions.update);

  const transactions = useMemo(() => {
    if (!txData) return [];
    return txData.map((doc) => ({
      id: doc._id,
      wallet_name: doc.wallet_name,
      type: doc.type,
      amount: doc.amount,
      category: doc.category,
      description: doc.description,
      transaction_date: doc.transaction_date,
      created_at: toDateString(doc._creationTime),
    })) as Transaction[];
  }, [txData]);

  const loading = txData === undefined;

  const totalIncome = useMemo(
    () => transactions.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0),
    [transactions]
  );
  const totalExpense = useMemo(
    () => transactions.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0),
    [transactions]
  );

  const addTransaction = useCallback(
    async (type: "income" | "expense", amount: number, category: string, description?: string) => {
      await addTxMut({
        type,
        amount,
        category,
        description: description ?? "",
      });
    },
    [addTxMut]
  );

  const deleteTransaction = useCallback(async (id: string) => {
    await deleteTxMut({ id: id as Id<"transactions"> });
  }, [deleteTxMut]);

  const updateTransaction = useCallback(
    async (id: string, data: { type?: "income" | "expense"; amount?: number; category?: string; description?: string; transaction_date?: string }) => {
      await updateTxMut({ id: id as Id<"transactions">, ...data });
    },
    [updateTxMut]
  );

  return {
    transactions,
    loading,
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    addTransaction,
    deleteTransaction,
    updateTransaction,
  };
}

// ─── Habits Hook ───

export function useHabits() {
  const habitsData = useQuery(api.habits.list);
  const addHabitMut = useMutation(api.habits.add);
  const logHabitMut = useMutation(api.habits.log);
  const removeHabitMut = useMutation(api.habits.remove);
  const updateHabitMut = useMutation(api.habits.update);

  const habits = useMemo(() => {
    if (!habitsData) return [];
    return habitsData.map((doc) => ({
      id: doc._id,
      name: doc.name,
      color: doc.color,
      icon: doc.icon,
      logs: doc.logs,
      streak: doc.streak,
      longest_streak: doc.longest_streak,
      created_at: toDateString(doc._creationTime),
    })) as Habit[];
  }, [habitsData]);

  const addHabit = useCallback(async (name: string, color: string, icon: string) => {
    await addHabitMut({ name, color, icon });
  }, [addHabitMut]);

  const logHabit = useCallback(async (id: string, date: string, done: boolean) => {
    await logHabitMut({ id: id as Id<"habits">, date, done });
  }, [logHabitMut]);

  const removeHabit = useCallback(async (id: string) => {
    await removeHabitMut({ id: id as Id<"habits"> });
  }, [removeHabitMut]);

  const updateHabit = useCallback(
    async (id: string, data: { name?: string; color?: string; icon?: string }) => {
      await updateHabitMut({ id: id as Id<"habits">, ...data });
    },
    [updateHabitMut]
  );

  return { habits, addHabit, logHabit, removeHabit, updateHabit };
}
