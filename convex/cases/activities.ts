import {
  internalMutation,
  internalQuery,
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

export const recordForAgent = internalMutation({
  args: {
    userId: v.string(),
    threadId: v.string(),
    caseId: v.id("cases"),
    type: v.union(
      v.literal("agent_action"),
      v.literal("research"),
      v.literal("email"),
      v.literal("user_action"),
      v.literal("external_response"),
    ),
    title: v.string(),
    description: v.optional(v.string()),
    metadata: v.optional(v.any()),
    summarize: v.optional(v.boolean()),
  },

  handler: async (ctx, args) => {
    const now = Date.now();

    const thread = await ctx.db
      .query("agentThreads")
      .withIndex(
        "by_external_thread_id",
        (q) =>
          q.eq(
            "externalThreadId",
            args.threadId,
          ),
      )
      .unique();

    if (
      !thread ||
      thread.userId !== args.userId
    ) {
      throw new Error(
        "Agent thread not found.",
      );
    }

    if (thread.caseId !== args.caseId) {
      throw new Error(
        "Agent is not attached to this Case.",
      );
    }

    const agent = await ctx.db.get(thread.agentId);

    if (
      !agent ||
      agent.userId !== args.userId ||
      agent.caseId !== args.caseId
    ) {
      throw new Error(
        "Agent not found.",
      );
    }

    const caseData = await ctx.db.get(args.caseId);

    if (
      !caseData ||
      caseData.userId !== args.userId
    ) {
      throw new Error(
        "Case not found.",
      );
    }

    const activityId = await ctx.db.insert(
      "caseActivities",
      {
        userId: args.userId,
        caseId: args.caseId,
        agentId: thread.agentId,
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