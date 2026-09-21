import { internalQuery, query } from "../_generated/server";
import { getCurrentUser } from "../agents/threads";
import { v } from "convex/values";

export const list = query({
  args: {},

  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    return await ctx.db
      .query("cases")
      .withIndex("by_user_id_status", (q) =>
        q.eq("userId", user._id),
      )
      .order("desc")
      .collect();
  },
});

export const listForAgent = internalQuery({
  args: {
    userId: v.string(),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("waiting_user"),
        v.literal("resolved"),
        v.literal("archived"),
      ),
    ),
    limit: v.number(),
  },

  handler: async (ctx, args) => {
    // const user = await getCurrentUser(ctx);

    const query = ctx.db
      .query("cases")
      .withIndex("by_user_id_status", (q) => {
        if (args.status) {
          return q
            .eq("userId", args.userId)
            .eq("status", args.status);
        }

        return q.eq("userId", args.userId);
      })
      .order("desc");

    return await query.take(args.limit);
  },
});