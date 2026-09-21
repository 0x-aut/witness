import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type QueryCtx,
  type MutationCtx,
} from "../_generated/server";

import type { Id } from "../_generated/dataModel";

import { v } from "convex/values";

import { getCurrentUser } from "../agents/threads";

const blockType = v.union(
  v.literal("narrative"),
  v.literal("widget"),
);

async function addWidgetToCase(
  ctx: MutationCtx,
  userId: string,
  caseId: Id<"cases">,
  widgetType:
    | "email"
    | "research"
    | "document"
    | "action"
    | "approval"
    | "question"
    | "link"
    | "result",
  data: unknown,
) {
  const now = Date.now();

  const latestBlock = await ctx.db
    .query("caseBlocks")
    .withIndex(
      "by_case_id_order",
      q => q.eq("caseId", caseId),
    )
    .order("desc")
    .first();

  const widgetId = await ctx.db.insert(
    "caseWidgets",
    {
      userId,
      caseId,
      type: widgetType,
      data,
      createdAt: now,
      updatedAt: now,
    },
  );

  /*
   * A widget block represents one horizontal row.
   *
   * Consecutive widgets are therefore grouped into the same block
   * instead of creating a new block for every widget.
   */
  if (
    latestBlock &&
    latestBlock.type === "widget"
  ) {
    const widgetIds = [
      ...(latestBlock.widgetIds ?? []),
      widgetId,
    ];

    await ctx.db.patch(
      latestBlock._id,
      {
        widgetIds,
        updatedAt: now,
      },
    );

    await ctx.db.patch(caseId, {
      updatedAt: now,
    });

    return {
      blockId: latestBlock._id,
      widgetId,
    };
  }

  const order = latestBlock
    ? latestBlock.order + 1000
    : 1000;

  const blockId = await ctx.db.insert(
    "caseBlocks",
    {
      userId,
      caseId,
      type: "widget",
      order,
      widgetIds: [widgetId],
      createdAt: now,
      updatedAt: now,
    },
  );

  await ctx.db.patch(caseId, {
    updatedAt: now,
  });

  return {
    blockId,
    widgetId,
  };
}

async function getOwnedCase(
  ctx: QueryCtx | MutationCtx,
  caseId: Id<"cases">,
) {
  const user = await getCurrentUser(ctx);

  const caseData = await ctx.db.get(caseId);

  if (!caseData || caseData.userId !== user._id) {
    throw new Error("Case not found.");
  }

  return {
    user,
    caseData,
  };
}

export const list = query({
  args: {
    caseId: v.id("cases"),
  },

  handler: async (ctx, args) => {
    const { caseData } = await getOwnedCase(
      ctx,
      args.caseId,
    );

    return await ctx.db
      .query("caseBlocks")
      .withIndex(
        "by_case_id_order",
        q => q.eq("caseId", caseData._id),
      )
      .order("asc")
      .collect();
  },
});

export const createNarrative = mutation({
  args: {
    caseId: v.id("cases"),
    text: v.string(),
    sourceActivityIds: v.optional(
      v.array(v.id("caseActivities")),
    ),
  },

  handler: async (ctx, args) => {
    const { user } = await getOwnedCase(
      ctx,
      args.caseId,
    );

    const existing = await ctx.db
      .query("caseBlocks")
      .withIndex(
        "by_case_id_order",
        q => q.eq("caseId", args.caseId),
      )
      .order("desc")
      .first();

    const now = Date.now();

    const order = existing
      ? existing.order + 1000
      : 1000;

    const blockId = await ctx.db.insert(
      "caseBlocks",
      {
        userId: user._id,
        caseId: args.caseId,
        type: "narrative",
        order,
        text: args.text,
        sourceActivityIds:
          args.sourceActivityIds,
        createdAt: now,
        updatedAt: now,
      },
    );

    await ctx.db.patch(args.caseId, {
      updatedAt: now,
    });

    return blockId;
  },
});

export const createWidget = mutation({
  args: {
    caseId: v.id("cases"),
    widgetType: v.union(
      v.literal("email"),
      v.literal("research"),
      v.literal("document"),
      v.literal("action"),
      v.literal("approval"),
      v.literal("question"),
      v.literal("link"),
      v.literal("result"),
    ),
    data: v.any(),
  },

  handler: async (ctx, args) => {
    const { user } = await getOwnedCase(
      ctx,
      args.caseId,
    );

    return await addWidgetToCase(
      ctx,
      user._id,
      args.caseId,
      args.widgetType,
      args.data,
    );
  },
});


export const updateNarrative = mutation({
  args: {
    id: v.id("caseBlocks"),
    text: v.string(),
  },

  handler: async (ctx, args) => {
    const { user } = await getOwnedCase(
      ctx,
      (
        await ctx.db.get(args.id)
      )?.caseId as Id<"cases">,
    );

    const block = await ctx.db.get(args.id);

    if (
      !block ||
      block.type !== "narrative" ||
      block.userId !== user._id
    ) {
      throw new Error("Narrative block not found.");
    }

    const now = Date.now();

    await ctx.db.patch(args.id, {
      text: args.text,
      updatedAt: now,
    });

    await ctx.db.patch(block.caseId, {
      updatedAt: now,
    });

    return args.id;
  },
});

export const remove = mutation({
  args: {
    id: v.id("caseBlocks"),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const block = await ctx.db.get(args.id);
    
    if (!block || block.userId !== user._id) {
      throw new Error("Block not found.");
    }
    
    if (block.widgetIds?.length) {
      for (const widgetId of block.widgetIds) {
        const widget = await ctx.db.get(widgetId);
    
        if (widget && widget.userId === user._id) {
          await ctx.db.delete(widgetId);
        }
      }
    }
    
    await ctx.db.delete(args.id);
    
    await ctx.db.patch(block.caseId, {
      updatedAt: Date.now(),
    });
    
    return args.id;

  },
});

export const reorder = mutation({
  args: {
    caseId: v.id("cases"),
    blockId: v.id("caseBlocks"),
    targetIndex: v.number(),
  },

  handler: async (ctx, args) => {
    const { user } = await getOwnedCase(
      ctx,
      args.caseId,
    );

    const blocks = await ctx.db
      .query("caseBlocks")
      .withIndex(
        "by_case_id_order",
        q => q.eq("caseId", args.caseId),
      )
      .order("asc")
      .collect();

    const currentIndex = blocks.findIndex(
      block => block._id === args.blockId,
    );

    if (currentIndex === -1) {
      throw new Error("Block not found.");
    }

    const block = blocks[currentIndex];

    if (block.userId !== user._id) {
      throw new Error("Unauthorized.");
    }

    const reordered = [...blocks];

    reordered.splice(currentIndex, 1);

    const targetIndex = Math.max(
      0,
      Math.min(
        Math.floor(args.targetIndex),
        reordered.length,
      ),
    );

    reordered.splice(targetIndex, 0, block);

    const now = Date.now();

    for (let index = 0; index < reordered.length; index++) {
      await ctx.db.patch(
        reordered[index]._id,
        {
          order: (index + 1) * 1000,
          updatedAt: now,
        },
      );
    }

    await ctx.db.patch(args.caseId, {
      updatedAt: now,
    });

    return true;
  },
});


export const createWidgetForAgent = internalMutation({
  args: {
    userId: v.string(),
    threadId: v.string(),
    caseId: v.id("cases"),
    widgetType: v.union(
      v.literal("email"),
      v.literal("research"),
      v.literal("document"),
      v.literal("action"),
      v.literal("approval"),
      v.literal("question"),
      v.literal("link"),
      v.literal("result"),
    ),
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

    return await addWidgetToCase(
      ctx,
      args.userId,
      args.caseId,
      args.widgetType,
      args.data,
    );
  },
});