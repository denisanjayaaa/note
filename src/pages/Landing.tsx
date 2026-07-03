import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { ArrowRight, CheckSquare, FileText, Wallet, Sparkles } from "lucide-react";

const FEATURES = [
  {
    icon: FileText,
    label: "Notes",
    desc: "Write, pin, and reorder your thoughts",
  },
  {
    icon: CheckSquare,
    label: "Tasks",
    desc: "Kanban board with drag & drop",
  },
  {
    icon: Wallet,
    label: "Finance",
    desc: "Track income, expenses, and budgets",
  },
  {
    icon: Sparkles,
    label: "All-in-One",
    desc: "Calendar, CSV editor & more",
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background" ref={containerRef}>
      {/* Subtle ambient gradient that follows the mouse */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, oklch(0.93 0.015 75 / 0.3), transparent 80%)`,
        }}
      />

      {/* Grid pattern overlay */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />

      {/* Navigation */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/10 text-sm font-bold">
            O
          </div>
          <span className="text-sm font-semibold tracking-tight">Workspace</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/auth")}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate("/auth")}
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-24 pb-16 md:pt-32">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles size={12} />
              Your productivity workspace
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl"
          >
            A refined space for{" "}
            <span className="italic text-muted-foreground">your work</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground"
          >
            Notes, tasks, finance, and calendar — thoughtfully designed in one
            clean workspace. Start organizing your projects today.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex items-center justify-center gap-3"
          >
            <button
              onClick={() => navigate("/auth")}
              className="inline-flex items-center gap-2 rounded-lg bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Get Started
              <ArrowRight size={15} />
            </button>
            <button
              onClick={() => navigate("/auth")}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
            >
              Sign In
            </button>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-24">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.08 }}
                className="group rounded-lg border border-border bg-card p-4 transition-all hover:border-muted-foreground/20"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-accent">
                  <Icon size={16} />
                </div>
                <h3 className="mt-3 text-sm font-medium">{feature.label}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {feature.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <p className="text-xs text-muted-foreground/60">
            Workspace &mdash; Built with ❤️
          </p>
          <p className="text-xs text-muted-foreground/40">
            &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
