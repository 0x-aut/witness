import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../agents/threads";

export const update = internalMutation({
  args: {
    id: v.id("cases"),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    category: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("waiting_user"),
        v.literal("resolved"),
        v.literal("archived"),
      ),
    ),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const existing = await ctx.db.get(args.id);

    if (!existing || existing.userId !== user._id) {
      throw new Error("Case not found.");
    }

    const { id, ...updates } = args;

    const cleanedUpdates = Object.fromEntries(
      Object.entries(updates).filter(
        ([, value]) => value !== undefined,
      ),
    );

    await ctx.db.patch(id, {
      ...cleanedUpdates,
      updatedAt: Date.now(),
    });

    if (
      args.status &&
      args.status !== existing.status
    ) {
      const statusLabels = {
        active: "Active",
        waiting_user: "Waiting for you",
        resolved: "Resolved",
        archived: "Archived",
      };

      await ctx.db.insert("caseActivities", {
        userId: user._id,
        caseId: id,
        type: "status_changed",
        title: "Status changed",
        description:
          `Case moved to ${statusLabels[args.status]}.`,
        createdAt: Date.now(),
      });
    }

    return id;
  },
});


export const updateForAgent = internalMutation({
  args: {
    userId: v.string(),
    threadId: v.string(),
    caseId: v.id("cases"),
    summary: v.optional(v.string()),
    category: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("waiting_user"),
        v.literal("resolved"),
        v.literal("archived"),
      ),
    ),
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

    const updates: {
      summary?: string;
      category?: string;
      status?:
        | "active"
        | "waiting_user"
        | "resolved"
        | "archived";
      updatedAt: number;
    } = {
      updatedAt: now,
    };

    if (args.summary !== undefined) {
      updates.summary = args.summary;
    }

    if (args.category !== undefined) {
      updates.category = args.category;
    }

    if (args.status !== undefined) {
      updates.status = args.status;
    }

    const hasChanges =
      args.summary !== undefined ||
      args.category !== undefined ||
      args.status !== undefined;

    if (!hasChanges) {
      return args.caseId;
    }

    await ctx.db.patch(args.caseId, updates);

    if (
      args.status !== undefined &&
      args.status !== caseData.status
    ) {
      const statusLabels = {
        active: "Active",
        waiting_user: "Waiting for you",
        resolved: "Resolved",
        archived: "Archived",
      };

      await ctx.db.insert("caseActivities", {
        userId: args.userId,
        caseId: args.caseId,
        agentId: thread.agentId,
        type: "status_changed",
        title: "Status changed",
        description:
          `Case moved to ${statusLabels[args.status]}.`,
        createdAt: now,
      });
    }

    return args.caseId;
  },
});