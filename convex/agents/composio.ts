"use node";

import { Composio } from "@composio/core";
import { v } from "convex/values";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

function getComposio() {
  const apiKey = process.env.COMPOSIO_API_KEY;

  if (!apiKey) {
    throw new Error("COMPOSIO_API_KEY is not configured.");
  }

  return new Composio({ apiKey });
}

async function getConnectedToolkits(ctx: any, userId: string) {
  const integrations = await ctx.runQuery(
    internal.integrationQueries.listConnectedForUser,
    { userId },
  );

  return [...new Set(integrations.map((integration: { toolkit: string }) => integration.toolkit))];
}

async function getOrCreateSession(ctx: any, userId: string) {
  const toolkits = await getConnectedToolkits(ctx, userId);

  if (toolkits.length === 0) {
    return null;
  }

  const composio = getComposio();

  const existing = await ctx.runQuery(
    internal.composioMutations.getSession,
    { userId },
  );

  if (existing) {
    try {
      const session = await composio.sessions.use(existing.sessionId);
      const current = [...existing.toolkits].sort();
      const next = [...toolkits].sort();
      const changed = current.length !== next.length || current.some((toolkit, index) => toolkit !== next[index]);

      if (changed) {
        await session.update({ toolkits });

        await ctx.runMutation(
          internal.composioMutations.saveSession,
          {
            userId,
            sessionId: session.sessionId,
            toolkits,
          },
        );
      }

      return session;
    } catch {
      // Stored session no longer exists; recreate it below.
    }
  }

  const session = await composio.sessions.create(userId, {
    toolkits,
  });

  await ctx.runMutation(
    internal.composioMutations.saveSession,
    {
      userId,
      sessionId: session.sessionId,
      toolkits,
    },
  );

  return session;
}

export const searchTools = internalAction({
  args: {
    userId: v.string(),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await getOrCreateSession(ctx, args.userId);

    if (!session) {
      return {
        connected: false,
        tools: [],
        message: "The user has no connected applications available to Witness.",
      };
    }

    const result = await session.search({
      query: args.query,
    });

    return {
      connected: true,
      result,
    };
  },
});

export const executeTool = internalAction({
  args: {
    userId: v.string(),
    toolSlug: v.string(),
    arguments: v.any(),
  },
  handler: async (ctx, args) => {
    const session = await getOrCreateSession(ctx, args.userId);

    if (!session) {
      throw new Error("The user has no connected applications.");
    }

    return await session.execute(args.toolSlug, args.arguments);
  },
});