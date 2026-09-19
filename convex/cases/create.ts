import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    userId: v.string(),
    title: v.string(),
    originalPrompt: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("cases", {
      userId: args.userId,
      title: args.title,
      originalPrompt: args.originalPrompt,
      category: args.category,
      status: "active",
      updatedAt: now,
    })
  },
})