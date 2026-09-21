import {
  mutation,
  query,
} from "../_generated/server";
import { internal } from "../_generated/api";

import { v } from "convex/values";

import { getCurrentUser } from "../agents/threads";

const activityType = v.union(
  v.literal("created"),
  v.literal("agent_action"),
  v.literal("research"),
  v.literal("email"),
  v.literal("user_action"),
  v.literal("status_changed"),
  v.literal("external_response"),
);

export const list = query({
  args: {
    caseId: v.id("cases"),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const caseData = await ctx.db.get(args.caseId);

    if (!caseData || caseData.userId !== user._id) {
      throw new Error("Case not found.");
    }

    return await ctx.db
      .query("caseActivities")
      .withIndex(
        "by_case_id_created_at",
        q => q.eq("caseId", args.caseId),
      )
      .order("desc")
      .collect();
  },
});

export const record = mutation({
  args: {
    caseId: v.id("cases"),
    agentId: v.optional(v.id("agents")),
    type: activityType,
    title: v.string(),
    description: v.optional(v.string()),
    metadata: v.optional(v.any()),
    summarize: v.optional(v.boolean()),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const caseData = await ctx.db.get(args.caseId);

    if (!caseData || caseData.userId !== user._id) {
      throw new Error("Case not found.");
    }

    if (args.agentId) {
      const agent = await ctx.db.get(args.agentId);

      if (
        !agent ||
        agent.userId !== user._id ||
        agent.caseId !== args.caseId
      ) {
        throw new Error("Agent not found.");
      }
    }

    const now = Date.now();

    const activityId = await ctx.db.insert(
      "caseActivities",
      {
        userId: user._id,
        caseId: args.caseId,
        agentId: args.agentId,
        type: args.type,
        title: args.title,
        description: args.description,
        metadata: args.metadata,
        createdAt: now,
      },
    );

    await ctx.db.patch(args.caseId, {
      updatedAt: now,
    });

    if (args.summarize) {
      await ctx.scheduler.runAfter(
        0,
        internal.cases.summarize.summarizeActivityBatch,
        {
          caseId: args.caseId,
          activityIds: [activityId],
        },
      );
    }

    return activityId;
  },
});