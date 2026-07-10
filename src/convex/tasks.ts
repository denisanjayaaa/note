import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const add = mutation({
  args: {
    title: v.string(),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    due_date: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    return await ctx.db.insert("tasks", {
      userId: user._id,
      title: args.title,
      description: args.description ?? "",
      status: args.status ?? "todo",
      priority: args.priority,
      due_date: args.due_date,
      tags: args.tags ?? [],
      subtasks: [],
      is_pinned: false,
      order: Date.now(),
    });
  },
});

export const updateStatus = mutation({
  args: { id: v.id("tasks"), status: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    await ctx.db.patch(args.id, { status: args.status, updated_at: new Date().toISOString() });
  },
});

export const updateTags = mutation({
  args: { id: v.id("tasks"), tags: v.array(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    await ctx.db.patch(args.id, { tags: args.tags, updated_at: new Date().toISOString() });
  },
});

export const toggleSubtask = mutation({
  args: { id: v.id("tasks"), subtaskId: v.string(), done: v.boolean() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");
    const subtasks = task.subtasks.map((st) =>
      st.id === args.subtaskId ? { ...st, done: args.done } : st
    );
    await ctx.db.patch(args.id, { subtasks, updated_at: new Date().toISOString() });
  },
});

export const addSubtask = mutation({
  args: { id: v.id("tasks"), title: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");
    const subtask = { id: Date.now().toString(), title: args.title, done: false };
    await ctx.db.patch(args.id, { subtasks: [...task.subtasks, subtask], updated_at: new Date().toISOString() });
  },
});

export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    due_date: v.optional(v.nullable(v.string())),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (args.title !== undefined) patch.title = args.title;
    if (args.priority !== undefined) patch.priority = args.priority;
    if (args.due_date !== undefined) patch.due_date = args.due_date;
    if (args.description !== undefined) patch.description = args.description;
    await ctx.db.patch(args.id, patch);
  },
});

export const togglePin = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");
    await ctx.db.patch(args.id, {
      is_pinned: !task.is_pinned,
      order: Date.now(),
      updated_at: new Date().toISOString(),
    });
  },
});

export const reorder = mutation({
  args: { id: v.id("tasks"), order: v.number() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    await ctx.db.patch(args.id, { order: args.order, updated_at: new Date().toISOString() });
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    await ctx.db.delete(args.id);
  },
});
