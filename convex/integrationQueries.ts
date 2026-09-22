import { internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./betterAuth/auth";

export const getConnection = query({
  args: { provider: v.string() },

  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized.");

    return await ctx.db
      .query("integrations")
      .withIndex("by_user_id_provider", q => q.eq("userId", user._id).eq("provider", args.provider))
      .unique();
  },
});

export const getConnectionForUser = internalQuery({
  args: {
    userId: v.string(),
    provider: v.string(),
  },

  handler: async (ctx, args) => {
    return await ctx.db
      .query("integrations")
      .withIndex("by_user_id_provider", q => q.eq("userId", args.userId).eq("provider", args.provider))
      .unique();
  },
});

export const listConnectedForUser = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const integrations = await ctx.db
      .query("integrations")
      .withIndex("by_user_id", q => q.eq("userId", args.userId))
      .collect();

    return integrations.filter(integration => integration.status === "connected" && integration.connectionId);
  },
});