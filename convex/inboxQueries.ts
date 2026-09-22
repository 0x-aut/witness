import { query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./betterAuth/auth";

export const list = query({
  args: {},
  handler: async ctx => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized.");

    return await ctx.db
      .query("inboxItems")
      .withIndex("by_user_id", q => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: {
    id: v.id("inboxItems"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized.");

    const item = await ctx.db.get(args.id);

    if (!item || item.userId !== user._id) {
      return null;
    }

    return item;
  },
});

export const unreadCount = query({
  args: {},
  handler: async ctx => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized.");

    const items = await ctx.db
      .query("inboxItems")
      .withIndex("by_user_id_read", q =>
        q.eq("userId", user._id).eq("read", false),
      )
      .collect();

    return items.length;
  },
});

// convex/inboxQueries.ts
export const getForUser = internalQuery({
  args: {
    id: v.id("inboxItems"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    return item?.userId === args.userId ? item : null;
  },
});