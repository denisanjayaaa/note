import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const add = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    folder_path: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    return await ctx.db.insert("notes", {
      userId: user._id,
      title: args.title,
      content: args.content,
      is_pinned: false,
      tags: [],
      folder_path: args.folder_path ?? "/",
      updated_at: new Date().toISOString(),
    });
  },
});

export const togglePin = mutation({
  args: { id: v.id("notes"), is_pinned: v.boolean() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    await ctx.db.patch(args.id, { is_pinned: !args.is_pinned, updated_at: new Date().toISOString() });
  },
});

export const update = mutation({
  args: {
    id: v.id("notes"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (args.title !== undefined) patch.title = args.title;
    if (args.content !== undefined) patch.content = args.content;
    await ctx.db.patch(args.id, patch);
  },
});

export const updateFolder = mutation({
  args: { id: v.id("notes"), folder_path: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    await ctx.db.patch(args.id, { folder_path: args.folder_path, updated_at: new Date().toISOString() });
  },
});

export const remove = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    await ctx.db.delete(args.id);
  },
});
