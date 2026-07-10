import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("habits")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    color: v.string(),
    icon: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    return await ctx.db.insert("habits", {
      userId: user._id,
      name: args.name,
      color: args.color,
      icon: args.icon,
      logs: [],
      streak: 0,
      longest_streak: 0,
    });
  },
});

function calculateStreak(logs: { date: string; done: boolean }[]): number {
  const sorted = [...logs].filter((l) => l.done).sort((a, b) => b.date.localeCompare(a.date));
  if (sorted.length === 0) return 0;

  let streak = 1;
  const today = new Date().toISOString().split("T")[0];

  // Check if most recent log is today or yesterday; otherwise streak is 0
  const mostRecent = sorted[0].date;
  const mostRecentDate = new Date(mostRecent + "T00:00:00");
  const todayDate = new Date(today + "T00:00:00");
  const diffMs = todayDate.getTime() - mostRecentDate.getTime();
  const diffDays = Math.round(diffMs / 86400000);
  if (diffDays > 1 && sorted[0].date !== today) return 0;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].date + "T00:00:00");
    const curr = new Date(sorted[i].date + "T00:00:00");
    const diff = Math.round((prev.getTime() - curr.getTime()) / 86400000);
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export const log = mutation({
  args: {
    id: v.id("habits"),
    date: v.string(),
    done: v.boolean(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const habit = await ctx.db.get(args.id);
    if (!habit) throw new Error("Habit not found");

    // Remove existing log for this date if any
    const filteredLogs = habit.logs.filter((l) => l.date !== args.date);
    const newLog = { date: args.date, done: args.done, note: args.note };
    const logs = [...filteredLogs, newLog];
    const streak = calculateStreak(logs);
    const longest_streak = Math.max(streak, habit.longest_streak);

    await ctx.db.patch(args.id, { logs, streak, longest_streak });
  },
});

export const update = mutation({
  args: {
    id: v.id("habits"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.color !== undefined) patch.color = args.color;
    if (args.icon !== undefined) patch.icon = args.icon;
    await ctx.db.patch(args.id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("habits") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    await ctx.db.delete(args.id);
  },
});
