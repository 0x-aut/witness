import { internalMutation, mutation } from "../_generated/server";
import { v } from "convex/values";

import { getCurrentUser } from "../agents/threads";
import { witnessAgent } from "../agents/witness";
import { components } from "../_generated/api";

export const remove = mutation({
  args: {
    id: v.id("cases"),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const caseData = await ctx.db.get(args.id);

    if (!caseData || caseData.userId !== user._id) {
      throw new Error("Case not found.");
    }

    const threads = await ctx.db
      .query("agentThreads")
      .withIndex("by_case_id", (q) =>
        q.eq("caseId", args.id),
      )
      .collect();

    for (const thread of threads) {
      if (thread.externalThreadId) {
        await witnessAgent.deleteThreadAsync(ctx, {
          threadId: thread.externalThreadId,
        });
      }

      await ctx.db.delete(thread._id);
    }

    const agents = await ctx.db
      .query("agents")
      .withIndex("by_case_id", (q) =>
        q.eq("caseId", args.id),
      )
      .collect();

    for (const agent of agents) {
      const actions = await ctx.db
        .query("userActions")
        .withIndex("by_agent_id", (q) =>
          q.eq("agentId", agent._id),
        )
        .collect();

      for (const action of actions) {
        await ctx.db.delete(action._id);
      }

      await ctx.db.delete(agent._id);
    }

    const inboxItems = await ctx.db
      .query("inboxItems")
      .withIndex("by_case_id", (q) =>
        q.eq("caseId", args.id),
      )
      .collect();

    for (const item of inboxItems) {
      await ctx.db.delete(item._id);
    }

    const files = await ctx.db
      .query("files")
      .withIndex("by_case_id", (q) =>
        q.eq("caseId", args.id),
      )
      .collect();

    for (const file of files) {
      await ctx.storage.delete(file.storageId);
      await ctx.db.delete(file._id);
    }

    // Delete case activities
    const activities = await ctx.db
      .query("caseActivities")
      .withIndex("by_case_id", (q) =>
        q.eq("caseId", args.id),
      )
      .collect();
    
    for (const activity of activities) {
      await ctx.db.delete(activity._id);
    }
    
    // Delete case blocks
    const blocks = await ctx.db
      .query("caseBlocks")
      .withIndex("by_case_id", (q) =>
        q.eq("caseId", args.id),
      )
      .collect();
    
    for (const block of blocks) {
      await ctx.db.delete(block._id);
    }
    
    // Delete case widgets
    const widgets = await ctx.db
      .query("caseWidgets")
      .withIndex("by_case_id", (q) =>
        q.eq("caseId", args.id),
      )
      .collect();
    
    for (const widget of widgets) {
      await ctx.db.delete(widget._id);
    }

    await ctx.db.delete(args.id);

    return {
      success: true,
    };
  },
});