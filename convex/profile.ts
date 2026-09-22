import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getAgentContext = query({
  args: {},

  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return "";
    }

    const record = await ctx.db
      .query("userContext")
      .withIndex("by_user_id", (q) =>
        q.eq("userId", identity.subject),
      )
      .unique();

    return record?.content ?? "";
  },
});

export const saveAgentContext = mutation({
  args: {
    content: v.string(),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Unauthorized");
    }

    const content = args.content.trim();

    if (content.length > 5000) {
      throw new Error(
        "Agent context cannot exceed 5,000 characters.",
      );
    }

    const existing = await ctx.db
      .query("userContext")
      .withIndex("by_user_id", (q) =>
        q.eq("userId", identity.subject),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        content,
        updatedAt: Date.now(),
      });

      return existing._id;
    }

    return await ctx.db.insert("userContext", {
      userId: identity.subject,
      content,
      updatedAt: Date.now(),
    });
  },
});