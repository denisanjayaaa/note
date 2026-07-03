import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // Notes
    notes: defineTable({
      userId: v.id("users"),
      title: v.string(),
      content: v.string(),
      is_pinned: v.boolean(),
      tags: v.array(v.string()),
    })
      .index("by_user", ["userId"])
      .index("by_user_pinned", ["userId", "is_pinned"]),

    // Tasks
    tasks: defineTable({
      userId: v.id("users"),
      title: v.string(),
      description: v.string(),
      status: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done")),
      priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
      due_date: v.optional(v.string()),
      tags: v.array(v.string()),
      subtasks: v.array(
        v.object({
          id: v.string(),
          title: v.string(),
          done: v.boolean(),
        })
      ),
    })
      .index("by_user", ["userId"])
      .index("by_user_status", ["userId", "status"]),

    // Transactions
    transactions: defineTable({
      userId: v.id("users"),
      type: v.union(v.literal("income"), v.literal("expense")),
      amount: v.number(),
      category: v.string(),
      description: v.string(),
      transaction_date: v.string(),
    })
      .index("by_user", ["userId"])
      .index("by_user_date", ["userId", "transaction_date"]),

    // Habits
    habits: defineTable({
      userId: v.id("users"),
      name: v.string(),
      color: v.string(),
      icon: v.string(),
      logs: v.array(
        v.object({
          date: v.string(),
          done: v.boolean(),
          note: v.optional(v.string()),
        })
      ),
      streak: v.number(),
      longest_streak: v.number(),
    })
      .index("by_user", ["userId"]),

  },
  {
    schemaValidation: false,
  },
);

export default schema;
