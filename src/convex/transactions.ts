import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const add = mutation({
  args: {
    type: v.union(v.literal("income"), v.literal("expense")),
    amount: v.number(),
    category: v.string(),
    description: v.optional(v.string()),
    transaction_date: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    return await ctx.db.insert("transactions", {
      userId: user._id,
      type: args.type,
      amount: args.amount,
      category: args.category,
      description: args.description ?? "",
      transaction_date: args.transaction_date ?? new Date().toISOString().split("T")[0],
    });
  },
});

export const remove = mutation({
  args: { id: v.id("transactions") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    await ctx.db.delete(args.id);
  },
});
