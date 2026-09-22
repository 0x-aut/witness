import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./betterAuth/auth";

export const markRead = mutation({
  args: {
    id: v.id("inboxItems"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized.");

    const item = await ctx.db.get(args.id);

    if (!item || item.userId !== user._id) {
      throw new Error("Inbox item not found.");
    }

    if (!item.read) {
      await ctx.db.patch(item._id, {
        read: true,
        updatedAt: Date.now(),
      });
    }

    return item._id;
  },
});

export const toggleStar = mutation({
  args: {
    id: v.id("inboxItems"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized.");

    const item = await ctx.db.get(args.id);

    if (!item || item.userId !== user._id) {
      throw new Error("Inbox item not found.");
    }

    const starred = !item.starred;

    await ctx.db.patch(item._id, {
      starred,
      updatedAt: Date.now(),
    });

    return starred;
  },
});

export const markAllRead = mutation({
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

    const now = Date.now();

    for (const item of items) {
      await ctx.db.patch(item._id, {
        read: true,
        updatedAt: now,
      });
    }

    return items.length;
  },
});