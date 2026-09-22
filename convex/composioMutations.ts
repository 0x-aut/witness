import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getSession = internalQuery({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("composioSessions")
      .withIndex("by_user_id", q => q.eq("userId", args.userId))
      .unique();
  },
});

export const saveSession = internalMutation({
  args: {
    userId: v.string(),
    sessionId: v.string(),
    toolkits: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("composioSessions")
      .withIndex("by_user_id", q => q.eq("userId", args.userId))
      .unique();

    const data = {
      sessionId: args.sessionId,
      toolkits: args.toolkits,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }

    return await ctx.db.insert("composioSessions", {
      userId: args.userId,
      ...data,
    });
  },
});