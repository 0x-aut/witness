import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const update = mutation({
  args: {
    id: v.id("cases"),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    category: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("waiting_user"),
        v.literal("resolved"),
        v.literal("archived"),
      ),
    ),
  },

  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);

    if (!existing) {
      throw new Error("Case not found.");
    }

    const { id, ...updates } = args;

    const cleanedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined),
    );

    await ctx.db.patch(id, {
      ...cleanedUpdates,
      updatedAt: Date.now(),
    });

    return id;
  },
});