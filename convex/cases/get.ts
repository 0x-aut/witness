import { query } from "../_generated/server";
import { v } from "convex/values";

import { getCurrentUser } from "../agents/threads";

export const get = query({
  args: {
    id: v.id("cases"),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const caseData = await ctx.db.get(args.id);

    if (!caseData || caseData.userId !== user._id) {
      throw new Error("Case not found.");
    }

    const agents = await ctx.db
      .query("agents")
      .withIndex("by_case_id", (q) =>
        q.eq("caseId", args.id),
      )
      .order("desc")
      .collect();

    const threads = await ctx.db
      .query("agentThreads")
      .withIndex("by_case_id", (q) =>
        q.eq("caseId", args.id),
      )
      .order("desc")
      .collect();

    const activities = await ctx.db
      .query("caseActivities")
      .withIndex("by_case_id", (q) =>
        q.eq("caseId", args.id),
      )
      .order("desc")
      .collect();

    return {
      caseData,
      agent: agents[0] ?? null,
      thread: threads[0] ?? null,
      activities,
    };
  },
});