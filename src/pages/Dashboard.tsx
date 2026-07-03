import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Wallet,
  FileSpreadsheet,
  CalendarDays,
  User,
  Search,
  Menu,
  X,
  Target,
  Code2,
} from "lucide-react";
import { Navigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { GlobalSearch } from "@/components/omnitask/GlobalSearch";
import { DashboardView } from "@/components/omnitask/DashboardView";
import { NotesView } from "@/components/omnitask/NotesView";
import { TasksView } from "@/components/omnitask/TasksView";
import { CalendarView } from "@/components/omnitask/CalendarView";
import { FinanceView } from "@/components/omnitask/FinanceView";
import { CsvEditor } from "@/components/omnitask/CsvEditor";
import { ProfileView } from "@/components/omnitask/ProfileView";
import { HabitTracker } from "@/components/omnitask/HabitTracker";
import { AiAssistant } from "@/components/omnitask/AiAssistant";
import StackBlitzView from "@/components/omnitask/StackBlitzView";
import {
  ThemeProvider,
  useNotes,
  useTasks,
  useTransactions,
  useHabits,
} from "@/components/omnitask/data";
import type { ActiveTab, Note } from "@/components/omnitask/data";
import { ThemeToggle } from "@/components/omnitask/ThemeToggle";

const NAV_ITEMS: { id: ActiveTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "notes", label: "Notes", icon: FileText },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "finance", label: "Finance", icon: Wallet },
  { id: "csv", label: "CSV Editor", icon: FileSpreadsheet },
  { id: "habits", label: "Habits", icon: Target },
  { id: "code", label: "Code", icon: Code2 },
];

function DashboardShell() {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { notes, folders, addNote, togglePinNote, deleteNote, updateNote, addFolder, renameFolder, deleteFolder, moveNoteToFolder } = useNotes();
  const { tasks, addTask, updateTaskStatus, deleteTask, addSubtask, toggleSubtask, updateTags, updateTask } = useTasks();
  const {
    transactions,
    totalIncome,
    totalExpense,
    balance,
    addTransaction,
    deleteTransaction,
    updateTransaction,
  } = useTransactions();
  const { habits, addHabit, logHabit, removeHabit, updateHabit } = useHabits();

  const handleNavigate = useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  }, []);

  const [activeNote, setActiveNote] = useState<Note | null>(null);

  const handleNoteSelect = useCallback((note: Note) => {
    setActiveNote(note);
  }, []);

  // Keyboard shortcut for search
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    },
    []
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <ThemeProvider>
      <div className="flex min-h-screen bg-background">
        {/* Sidebar backdrop */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/20"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              key="sidebar"
              initial={{ x: -224 }}
              animate={{ x: 0 }}
              exit={{ x: -224 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r border-border bg-card shadow-lg"
            >
              <div className="flex h-14 items-center justify-between border-b border-border px-5">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground/10 text-xs font-bold">
                    O
                  </div>
                  <span className="text-sm font-semibold">Workspace</span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent"
                >
                  <X size={16} />
                </button>
              </div>
              <nav className="flex-1 space-y-1 p-3">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        activeTab === item.id
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      }`}
                    >
                      <Icon size={16} />
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              {/* Separator */}
              <div className="border-t border-border" />

              {/* Profile at bottom */}
              <div className="p-3">
                <button
                  onClick={() => handleNavigate("profile")}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === "profile"
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                >
                  <User size={16} />
                  Profile
                </button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main content */}
        <div className="flex flex-1 flex-col">
          {/* Top bar */}
          <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent"
                title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
              >
                <Menu size={18} />
              </button>
              <button
                onClick={() => setSearchOpen(true)}
                className="hidden items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-muted-foreground/30 sm:flex"
              >
                <Search size={14} />
                <span>Search...</span>
                <kbd className="ml-6 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/60">
                  ⌘K
                </kbd>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSearchOpen(true)}
                className="rounded-md p-2 text-muted-foreground hover:bg-accent sm:hidden"
              >
                <Search size={16} />
              </button>
              <ThemeToggle />
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-auto p-6 lg:p-8">
            <AnimatePresence mode="wait">
              {activeTab === "dashboard" && (
                <DashboardView
                  key="dashboard"
                  notes={notes}
                  tasks={tasks}
                  transactions={transactions}
                  totalIncome={totalIncome}
                  totalExpense={totalExpense}
                  balance={balance}
                  onNavigate={handleNavigate}
                />
              )}
              {activeTab === "notes" && (
                <NotesView
                  key="notes"
                  notes={notes}
                  folders={folders}
                  addNote={addNote}
                  togglePinNote={togglePinNote}
                  deleteNote={deleteNote}
                  updateNote={updateNote}
                  onNoteSelect={handleNoteSelect}
                  addFolder={addFolder}
                  renameFolder={renameFolder}
                  deleteFolder={deleteFolder}
                  moveNoteToFolder={moveNoteToFolder}
                />
              )}
              {activeTab === "tasks" && (
                <TasksView
                  key="tasks"
                  tasks={tasks}
                  addTask={addTask}
                  updateTaskStatus={updateTaskStatus}
                  deleteTask={deleteTask}
                  addSubtask={addSubtask}
                  toggleSubtask={toggleSubtask}
                  updateTags={updateTags}
                  updateTask={updateTask}
                />
              )}
              {activeTab === "calendar" && (
                <CalendarView key="calendar" tasks={tasks} />
              )}
              {activeTab === "finance" && (
                <FinanceView
                  key="finance"
                  transactions={transactions}
                  totalIncome={totalIncome}
                  totalExpense={totalExpense}
                  balance={balance}
                  addTransaction={addTransaction}
                  deleteTransaction={deleteTransaction}
                  updateTransaction={updateTransaction}
                />
              )}
              {activeTab === "csv" && <CsvEditor key="csv" />}
              {activeTab === "habits" && (
                <HabitTracker
                  key="habits"
                  habits={habits}
                  addHabit={addHabit}
                  logHabit={logHabit}
                  removeHabit={removeHabit}
                  updateHabit={updateHabit}
                />
              )}
              {activeTab === "profile" && (
                <ProfileView
                  key="profile"
                  notes={notes}
                  tasks={tasks}
                  transactions={transactions}
                />
              )}
              {activeTab === "code" && (
                <StackBlitzView key="code" />
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Global search */}
      <GlobalSearch
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={handleNavigate}
        notes={notes}
        tasks={tasks}
        transactions={transactions}
        habits={habits}
      />

      {/* AI Assistant */}
      <AiAssistant
        notes={notes}
        tasks={tasks}
        transactions={transactions}
        onAddTask={(title, priority) => addTask(title, priority)}
        activeNote={activeNote}
      />
    </ThemeProvider>
  );
}

export default function DashboardPage() {
  return <DashboardShell />;
}
