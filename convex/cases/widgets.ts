import {
  mutation,
  query,
  internalQuery,
  internalMutation,
} from "../_generated/server";

import { v } from "convex/values";

import { getCurrentUser } from "../agents/threads";

const widgetType = v.union(
  v.literal("email"),
  v.literal("research"),
  v.literal("document"),
  v.literal("action"),
  v.literal("approval"),
  v.literal("question"),
  v.literal("link"),
  v.literal("result"),
);

export const get = internalQuery({
  args: {
    id: v.id("caseWidgets"),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const widget = await ctx.db.get(args.id);

    if (!widget || widget.userId !== user._id) {
      throw new Error("Widget not found.");
    }

    const caseData = await ctx.db.get(widget.caseId);

    if (!caseData || caseData.userId !== user._id) {
      throw new Error("Case not found.");
    }

    return widget;
  },
});

export const list = internalQuery({
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
      .query("caseWidgets")
      .withIndex(
        "by_case_id",
        q => q.eq("caseId", args.caseId),
      )
      .order("asc")
      .collect();
  },
});

export const create = internalMutation({
  args: {
    caseId: v.id("cases"),
    type: widgetType,
    data: v.any(),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const caseData = await ctx.db.get(args.caseId);

    if (!caseData || caseData.userId !== user._id) {
      throw new Error("Case not found.");
    }

    const now = Date.now();

    return await ctx.db.insert("caseWidgets", {
      userId: user._id,
      caseId: args.caseId,
      type: args.type,
      data: args.data,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const createForAgent = internalMutation({
  args: {
    userId: v.string(),
    threadId: v.string(),
    caseId: v.id("cases"),
    type: widgetType,
    data: v.any(),
  },

  handler: async (ctx, args) => {
    const thread = await ctx.db
      .query("agentThreads")
      .withIndex(
        "by_external_thread_id",
        q =>
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

    const agent = await ctx.db.get(
      thread.agentId,
    );

    if (
      !agent ||
      agent.userId !== args.userId ||
      agent.caseId !== args.caseId
    ) {
      throw new Error(
        "Agent not found.",
      );
    }

    const caseData = await ctx.db.get(
      args.caseId,
    );

    if (
      !caseData ||
      caseData.userId !== args.userId
    ) {
      throw new Error(
        "Case not found.",
      );
    }

    const now = Date.now();

    const widgetId = await ctx.db.insert(
      "caseWidgets",
      {
        userId: args.userId,
        caseId: args.caseId,
        type: args.type,
        data: args.data,
        createdAt: now,
        updatedAt: now,
      },
    );

    const latestBlock = await ctx.db
      .query("caseBlocks")
      .withIndex(
        "by_case_id_order",
        q => q.eq("caseId", args.caseId),
      )
      .order("desc")
      .first();

    if (
      latestBlock &&
      latestBlock.type === "widget"
    ) {
      await ctx.db.patch(
        latestBlock._id,
        {
          widgetIds: [
            ...(latestBlock.widgetIds ?? []),
            widgetId,
          ],
          updatedAt: now,
        },
      );

      await ctx.db.patch(args.caseId, {
        updatedAt: now,
      });

      return {
        widgetId,
        blockId: latestBlock._id,
      };
    }

    const blockId = await ctx.db.insert(
      "caseBlocks",
      {
        userId: args.userId,
        caseId: args.caseId,
        type: "widget",
        order: latestBlock
          ? latestBlock.order + 1000
          : 1000,
        widgetIds: [widgetId],
        createdAt: now,
        updatedAt: now,
      },
    );

    await ctx.db.patch(args.caseId, {
      updatedAt: now,
    });

    return {
      widgetId,
      blockId,
    };
  },
});