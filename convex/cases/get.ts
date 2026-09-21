import { internalQuery, query } from "../_generated/server";
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


export const getCurrentForAgent = internalQuery({
  args: {
    userId: v.string(),
    threadId: v.string(),
  },

  handler: async (ctx, args) => {

    // const user = await getCurrentUser(ctx);
    
    const thread = await ctx.db
      .query("agentThreads")
      .withIndex(
        "by_external_thread_id",
        (q) => q.eq("externalThreadId", args.threadId),
      )
      .unique();

    if (!thread || thread.userId !== args.userId) {
      return null;
    }

    if (!thread.caseId) {
      return null;
    }

    const caseData = await ctx.db.get(thread.caseId);

    if (!caseData || caseData.userId !== args.userId) {
      return null;
    }

    return {
      caseId: caseData._id,
      title: caseData.title,
      summary: caseData.summary ?? null,
      category: caseData.category ?? null,
      status: caseData.status,
      updatedAt: caseData.updatedAt,
      originalPrompt: caseData.originalPrompt,
      agentId: thread.agentId,
      threadId: thread.externalThreadId,
    };
  },
});



export const getForAgent = internalQuery({
  args: {
    userId: v.string(),
    caseId: v.id("cases"),
  },

  handler: async (ctx, args) => {
    // const user = await getCurrentUser(ctx);
    
    const caseData = await ctx.db.get(args.caseId);

    if (!caseData || caseData.userId !== args.userId) {
      throw new Error("Case not found.");
    }

    const agents = await ctx.db
      .query("agents")
      .withIndex(
        "by_case_id",
        (q) => q.eq("caseId", args.caseId),
      )
      .order("desc")
      .take(10);

    const activities = await ctx.db
      .query("caseActivities")
      .withIndex(
        "by_case_id_created_at",
        (q) => q.eq("caseId", args.caseId),
      )
      .order("desc")
      .take(20);

    const blocks = await ctx.db
      .query("caseBlocks")
      .withIndex(
        "by_case_id_order",
        (q) => q.eq("caseId", args.caseId),
      )
      .order("asc")
      .collect();

    const documentBlocks = [];

    for (const block of blocks) {
      if (block.type === "narrative") {
        documentBlocks.push({
          ...block,
          widget: null,
        });

        continue;
      }

      if (!block.widgetId) {
        continue;
      }

      const widget = await ctx.db.get(block.widgetId);

      if (!widget || widget.userId !== args.userId) {
        continue;
      }

      documentBlocks.push({
        ...block,
        widget,
      });
    }

    return {
      caseData,
      agents,
      activities,
      document: {
        caseId: args.caseId,
        blocks: documentBlocks,
      },
    };
  },
});