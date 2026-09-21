import { query } from "../_generated/server";
import { getCurrentUser } from "../agents/threads";

export const list = query({
  args: {},

  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    return await ctx.db
      .query("cases")
      .withIndex("by_user_id", (q) =>
        q.eq("userId", user._id),
      )
      .order("desc")
      .collect();
  },
});