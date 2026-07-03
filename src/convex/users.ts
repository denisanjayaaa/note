import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get the current signed in user. Returns null if the user is not signed in.
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user === null) return null;
    return user;
  },
});

/**
 * Use this function internally to get the current user data.
 */
export const getCurrentUser = async (ctx: QueryCtx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return null;
  return await ctx.db.get(userId);
};

/**
 * Update the current user's profile (name, image).
 */
/**
 * Update the current user's profile (name, image, username).
 */
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    username: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const patchData: Record<string, string | undefined> = {};
    if (args.name !== undefined) patchData.name = args.name;
    if (args.image !== undefined) patchData.image = args.image;
    if (args.username !== undefined) {
      // Validate username
      const u = args.username.trim();
      if (u.length < 3) throw new Error("Username must be at least 3 characters");
      if (!/^[a-zA-Z0-9_-]+$/.test(u)) throw new Error("Username can only contain letters, numbers, underscores, and hyphens");

      // Check uniqueness
      const existing = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", u))
        .first();
      if (existing && existing._id !== userId) throw new Error("Username already taken");

      patchData.username = u;
    }

    if (Object.keys(patchData).length > 0) {
      await ctx.db.patch(userId, patchData);
    }

    return await ctx.db.get(userId);
  },
});

/**
 * Update the current user's email (after OTP verification).
 */
export const updateEmail = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const email = args.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Invalid email format");
    }

    // Check if email is already taken
    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
    if (existing && existing._id !== userId) throw new Error("Email already in use");

    await ctx.db.patch(userId, {
      email,
      emailVerificationTime: Date.now(),
    });

    return await ctx.db.get(userId);
  },
});
