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
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const patchData: Record<string, string> = {};
    if (args.name !== undefined) patchData.name = args.name;
    if (args.image !== undefined) patchData.image = args.image;

    if (Object.keys(patchData).length > 0) {
      await ctx.db.patch(userId, patchData);
    }

    return await ctx.db.get(userId);
  },
});
