import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../agents/threads";

import { authComponent } from "../betterAuth/auth";

import { internal, components } from "../_generated/api";

export const create = mutation({
  args: {
    title: v.string(),
    originalPrompt: v.string(),
    category: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const userId = user._id;
    const now = Date.now();

    return await ctx.db.insert("cases", {
      userId,
      title: args.title,
      originalPrompt: args.originalPrompt,
      category: args.category,
      status: "active",
      updatedAt: now,
    });
  },
});

export const createForAgent = internalMutation({
  args: {
    userId: v.string(),
    threadId: v.string(),
    title: v.string(),
    originalPrompt: v.string(),
    category: v.optional(v.string()),
  },

  handler: async (ctx, args) => {

    const authUser = await authComponent.getAnyUserById(
      ctx,
      args.userId,
    );
    
    if (!authUser) {
      throw new Error("User not found.");
    }

    if (authUser) {
      console.log(`${authUser.displayUsername}`)
      console.log(authUser)
    }

    const displayUsername =
      authUser.displayUsername ??
      authUser.name
    
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

    const agentId = thread.agentId;

    const agent = await ctx.db.get(agentId);

    if (
      !agent ||
      agent.userId !== args.userId
    ) {
      throw new Error(
        "Agent not found.",
      );
    }

    if (thread.caseId || agent.caseId) {
      throw new Error(
        "This Agent is already attached to a Case.",
      );
    }

    const caseId = await ctx.db.insert(
      "cases",
      {
        userId: args.userId,
        title: args.title,
        originalPrompt: args.originalPrompt,
        category: args.category,
        status: "active",
        updatedAt: now,
      },
    );

    await ctx.db.patch(agentId, {
      caseId,
      updatedAt: now,
    });

    await ctx.db.patch(thread._id, {
      caseId,
      updatedAt: now,
    });

    const activityId = await ctx.db.insert(
      "caseActivities",
      {
        userId: args.userId,
        caseId,
        agentId,
        type: "created",
        title: "Case created",
        description:
          "Witness started working on this problem.",
        createdAt: now,
      },
    );

    await ctx.scheduler.runAfter(
      0,
      internal.cases.summarize.summarizeInitial,
      {
        caseId,
        activityId,
        threadId: args.threadId,
        prompt: args.originalPrompt,
        displayUsername,
      },
    );

    return {
      caseId,
      agentId,
      threadId: args.threadId,
    };
  },
});