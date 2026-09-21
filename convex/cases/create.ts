import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../agents/threads";

export const create = mutation({
  args: {
    title: v.string(),
    originalPrompt: v.string(),
    category: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const userId = user._id;
    const now = Date.now();

    return await ctx.db.insert("cases", {
      userId,
      title: args.title,
      originalPrompt: args.originalPrompt,
      category: args.category,
      status: "active",
      updatedAt: now,
    });
  },
});