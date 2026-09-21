import {
  getThreadMetadata,
  createThread,
} from "@convex-dev/agent";

import { witnessAgent } from "./witness";

import {
  mutation,
  query,
  type ActionCtx,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server";

import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { components } from "../_generated/api";
import { authComponent } from "../betterAuth/auth";

export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx | ActionCtx,
) {
  const user = await authComponent.getAuthUser(ctx);

  if (!user) {
    throw new Error("Unauthorized.");
  }

  return user;
}

export async function authorizeThreadAccess(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  threadId: string,
) {
  const user = await getCurrentUser(ctx);
  const userId = user._id;

  const thread = await getThreadMetadata(ctx, components.agent, {
    threadId,
  });

  if (thread.userId !== userId) {
    throw new Error("Unauthorized.");
  }

  return {
    user,
    thread,
  };
}

export const remove = mutation({
  args: {
    threadId: v.string(),
  },

  handler: async (ctx, args) => {
    await authorizeThreadAccess(ctx, args.threadId);

    await witnessAgent.deleteThreadAsync(ctx, {
      threadId: args.threadId,
    });

    return {
      success: true,
    };
  },
});
export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const userId = user._id;

    return await ctx.runQuery(
      components.agent.threads.listThreadsByUserId,
      {
        userId,
        paginationOpts: args.paginationOpts,
      },
    );
  },
});

export const create = mutation({
  args: {
    title: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const userId = user._id;

    const threadId = await createThread(ctx, components.agent, {
      userId,
      title: args.title ?? "Witness",
    });

    return threadId;
  },
});

export const get = query({
  args: {
    threadId: v.string(),
  },

  handler: async (ctx, args) => {
    await authorizeThreadAccess(ctx, args.threadId);

    return await getThreadMetadata(ctx, components.agent, {
      threadId: args.threadId,
    });
  },
});