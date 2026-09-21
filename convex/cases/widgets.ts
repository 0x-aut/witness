import {
  mutation,
  query,
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

export const get = query({
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
      .query("caseWidgets")
      .withIndex(
        "by_case_id",
        q => q.eq("caseId", args.caseId),
      )
      .order("asc")
      .collect();
  },
});

export const create = mutation({
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

export const update = mutation({
  args: {
    id: v.id("caseWidgets"),
    data: v.optional(v.any()),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const widget = await ctx.db.get(args.id);

    if (!widget || widget.userId !== user._id) {
      throw new Error("Widget not found.");
    }

    if (args.data === undefined) {
      return widget._id;
    }

    await ctx.db.patch(args.id, {
      data: args.data,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

export const remove = mutation({
  args: {
    id: v.id("caseWidgets"),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const widget = await ctx.db.get(args.id);

    if (!widget || widget.userId !== user._id) {
      throw new Error("Widget not found.");
    }

    await ctx.db.delete(args.id);

    return args.id;
  },
});