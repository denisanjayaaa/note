import { Moon, Sun } from "lucide-react";
import { useTheme } from "./data";
import { motion } from "framer-motion";

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-accent"
      aria-label="Toggle theme"
    >
      <motion.div
        key={isDark ? "moon" : "sun"}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        exit={{ rotate: 90, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {isDark ? (
          <Moon size={16} className="text-amber-400" />
        ) : (
          <Sun size={16} className="text-muted-foreground" />
        )}
      </motion.div>
    </button>
  );
}
