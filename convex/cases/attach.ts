import {
  mutation,
  internalMutation,
  query,
  internalQuery,
} from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../agents/threads";

import { internal, components } from "../_generated/api";

export const enterForAgent = internalMutation({
  args: {
    userId: v.string(),
    threadId: v.string(),
    caseId: v.id("cases"),
  },

  handler: async (ctx, args) => {
    // const user = await getCurrentUser(ctx);
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

    const caseData = await ctx.db.get(args.caseId);

    if (
      !caseData ||
      caseData.userId !== args.userId
    ) {
      throw new Error(
        "Case not found.",
      );
    }

    const agent = await ctx.db.get(thread.agentId);

    if (
      !agent ||
      agent.userId !== args.userId
    ) {
      throw new Error(
        "Agent not found.",
      );
    }

    if (
      thread.caseId &&
      thread.caseId !== args.caseId
    ) {
      throw new Error(
        "This conversation is already attached to another Case.",
      );
    }

    if (
      agent.caseId &&
      agent.caseId !== args.caseId
    ) {
      throw new Error(
        "This Agent is already attached to another Case.",
      );
    }

    if (
      thread.caseId === args.caseId &&
      agent.caseId === args.caseId
    ) {
      return {
        caseId: args.caseId,
        agentId: thread.agentId,
        threadId: args.threadId,
      };
    }

    await ctx.db.patch(thread._id, {
      caseId: args.caseId,
      updatedAt: now,
    });

    await ctx.db.patch(thread.agentId, {
      caseId: args.caseId,
      updatedAt: now,
    });

    await ctx.db.insert("caseActivities", {
      userId: args.userId,
      caseId: args.caseId,
      agentId: thread.agentId,
      type: "agent_action",
      title: "Witness entered this Case",
      description:
        "Witness connected this conversation to the existing Case.",
      createdAt: now,
    });

    await ctx.db.patch(args.caseId, {
      updatedAt: now,
    });

    return {
      caseId: args.caseId,
      agentId: thread.agentId,
      threadId: args.threadId,
    };
  },
});