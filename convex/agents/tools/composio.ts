import { createTool } from "@convex-dev/agent";
import { z } from "zod/v4";
import { internal } from "../../_generated/api";

export const searchComposioTools = createTool({
  description: `
Search the user's connected external applications for tools relevant to the current task.

Use this before attempting an action in Gmail, Google Drive, or another connected application.

The search returns the available tool names, descriptions, schemas, connection information, and execution guidance.

Never invent a Composio tool slug or arguments.
`.trim(),

  inputSchema: z.object({
    query: z.string().min(2).max(500),
  }),

  execute: async (ctx, input) => {
    if (!ctx.userId) {
      throw new Error("Missing authenticated user.");
    }

    return await ctx.runAction(internal.agents.composio.searchTools, {
      userId: ctx.userId,
      query: input.query,
    });
  },
});

export const executeComposioTool = createTool({
  description: `
Execute a Composio tool discovered through searchComposioTools.

Only execute a tool that was returned by Composio search.
Use the exact tool slug and arguments required by its returned schema.
`.trim(),

  inputSchema: z.object({
    toolSlug: z.string().min(1),
    arguments: z.record(z.string(), z.unknown()),
  }),

  execute: async (ctx, input) => {
    if (!ctx.userId) {
      throw new Error("Missing authenticated user.");
    }

    return await ctx.runAction(internal.agents.composio.executeTool, {
      userId: ctx.userId,
      toolSlug: input.toolSlug,
      arguments: input.arguments,
    });
  },
});