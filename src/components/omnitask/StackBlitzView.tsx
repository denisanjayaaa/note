import { useCallback } from "react";
import { motion } from "framer-motion";
import { Code2, ExternalLink, FileCode, FolderOpen, GitBranch, Sparkles, Terminal } from "lucide-react";
import sdk from "@stackblitz/sdk";

const FILES: Record<string, string> = {
  ".env.local": `VITE_CONVEX_URL=https://clear-herring-980.convex.cloud
CONVEX_SITE_URL=https://clear-herring-980.convex.site`,

  "src/main.tsx": `import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { BrowserRouter } from "react-router";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);
createRoot(document.getElementById("root")!).render(
  <ConvexAuthProvider client={convex}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ConvexAuthProvider>
);`,

  "src/App.tsx": `import { Routes, Route } from "react-router";
import { lazy } from "react";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}`,

  "src/convex/auth.ts": `import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { emailOtp } from "./auth/emailOtp";
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [emailOtp, Anonymous],
});`,

  "src/convex/schema.ts": `import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export default defineSchema({
  ...authTables,
  users: defineTable({ name: v.optional(v.string()), image: v.optional(v.string()), email: v.optional(v.string()), isAnonymous: v.optional(v.boolean()) }).index("email", ["email"]),
  notes: defineTable({ userId: v.id("users"), title: v.string(), content: v.string(), is_pinned: v.boolean(), tags: v.array(v.string()) }).index("by_user", ["userId"]),
  tasks: defineTable({ userId: v.id("users"), title: v.string(), description: v.string(), status: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done")), priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")), subtasks: v.array(v.object({ id: v.string(), title: v.string(), done: v.boolean() })) }).index("by_user", ["userId"]),
  transactions: defineTable({ userId: v.id("users"), type: v.union(v.literal("income"), v.literal("expense")), amount: v.number(), category: v.string(), transaction_date: v.string() }).index("by_user", ["userId"]),
  habits: defineTable({ userId: v.id("users"), name: v.string(), color: v.string(), icon: v.string(), logs: v.array(v.object({ date: v.string(), done: v.boolean() })), streak: v.number(), longest_streak: v.number() }).index("by_user", ["userId"]),
}, { schemaValidation: false });`,
};

const FILE_EXPLORER: { label: string; files: { name: string; desc: string }[] }[] = [
  {
    label: "src/",
    files: [
      { name: "main.tsx", desc: "Entry point" },
      { name: "App.tsx", desc: "Routes" },
      { name: "index.css", desc: "Styles + theme" },
    ],
  },
  {
    label: "src/convex/",
    files: [
      { name: "schema.ts", desc: "Database schema" },
      { name: "auth.ts", desc: "Authentication" },
      { name: "tasks.ts", desc: "Tasks CRUD" },
      { name: "notes.ts", desc: "Notes CRUD" },
      { name: "habits.ts", desc: "Habits CRUD" },
    ],
  },
  {
    label: "src/components/",
    files: [
      { name: "DashboardView.tsx", desc: "Dashboard" },
      { name: "TasksView.tsx", desc: "Kanban board" },
      { name: "NotesView.tsx", desc: "Notes editor" },
      { name: "FinanceView.tsx", desc: "Finance tracker" },
      { name: "HabitTracker.tsx", desc: "Habit tracker" },
      { name: "ProfileView.tsx", desc: "Profile + stats" },
    ],
  },
  {
    label: "src/pages/",
    files: [
      { name: "Landing.tsx", desc: "Landing page" },
      { name: "Auth.tsx", desc: "Sign in / Sign up" },
      { name: "Dashboard.tsx", desc: "Main layout" },
    ],
  },
];

export default function StackBlitzView() {
  const handleOpenInTab = useCallback(async () => {
    await sdk.openProject(
      {
        title: "Workspace - Studio Refine",
        description: "All-in-one productivity workspace",
        template: "node",
        files: FILES,
        settings: { compile: { trigger: "save" } },
      },
      { newWindow: true, openFile: "src/main.tsx" }
    );
  }, []);

  const handleEditStyles = useCallback(async () => {
    await sdk.openProject(
      {
        title: "Workspace - Studio Refine",
        description: "All-in-one productivity workspace",
        template: "node",
        files: FILES,
        settings: { compile: { trigger: "save" } },
      },
      { newWindow: true, openFile: "src/index.css" }
    );
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-4xl space-y-8"
    >
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
            <Code2 size={18} />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Code Editor</h1>
            <p className="text-sm text-muted-foreground">
              Edit project source code directly via StackBlitz
            </p>
          </div>
        </div>
      </div>

      {/* Main card */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Top bar */}
        <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-5 py-3">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>
          <span className="text-xs font-medium text-muted-foreground/60">
            ~/workspace/src
          </span>
        </div>

        <div className="p-6">
          {/* File explorer preview */}
          <div className="mb-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <FolderOpen size={13} />
              Project Files
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {FILE_EXPLORER.map((group) => (
                <div
                  key={group.label}
                  className="rounded-lg border border-border bg-background p-3"
                >
                  <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <FileCode size={12} />
                    {group.label}
                  </div>
                  <div className="space-y-1">
                    {group.files.map((file) => (
                      <div
                        key={file.name}
                        className="flex items-center justify-between rounded px-2 py-1 text-xs transition-colors hover:bg-accent"
                      >
                        <span className="font-mono text-foreground/80">
                          {file.name}
                        </span>
                        <span className="text-muted-foreground/60">
                          {file.desc}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tech stack */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {[
              { label: "React", icon: "\u269B\uFE0F" },
              { label: "TypeScript", icon: "\uD83D\uDCD8" },
              { label: "Vite", icon: "\u26A1" },
              { label: "Tailwind", icon: "\uD83C\uDFA8" },
              { label: "Convex", icon: "\uD83D\uDD37" },
              { label: "Bun", icon: "\uD83E\uDD5F" },
            ].map((tech) => (
              <span
                key={tech.label}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
              >
                {tech.icon} {tech.label}
              </span>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleOpenInTab}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-600 active:scale-[0.98]"
            >
              <Sparkles size={16} />
              Open in StackBlitz
              <ExternalLink size={14} className="opacity-70" />
            </button>
            <button
              onClick={handleEditStyles}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-5 py-3 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Terminal size={16} />
              Edit Styles
            </button>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <GitBranch size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
          <div className="text-xs leading-relaxed text-muted-foreground">
            <p className="font-medium text-foreground">How it works</p>
            <p className="mt-1">
              StackBlitz creates an isolated WebContainer with your project's source code.
              Edit files, run dev server, and see changes in real-time. Changes are temporary
              — download or fork to save your work.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
