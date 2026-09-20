import {
  internalAction,
  mutation,
  query,
} from "../_generated/server";

import { internal } from "../_generated/api";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

import {
  createThread,
  listUIMessages,
  saveMessage,
  syncStreams,
  vStreamArgs,
} from "@convex-dev/agent";

import { components } from "../_generated/api";
import { witnessAgent } from "./witness";
import { authorizeThreadAccess, getCurrentUser } from "./threads";

/**
 * Save the user's message immediately and schedule the Agent response.
 */
export const sendMessage = mutation({
  args: {
    prompt: v.string(),
    threadId: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const prompt = args.prompt.trim();

    if (!prompt) {
      throw new Error("Prompt cannot be empty.");
    }

    const user = await getCurrentUser(ctx);

    let threadId = args.threadId;

    if (!threadId) {
      threadId = await createThread(ctx, components.agent, {
        userId: user.id,
        title: "Witness",
      });
    } else {
      await authorizeThreadAccess(ctx, threadId);
    }

    const { messageId, message } = await saveMessage(
      ctx,
      components.agent,
      {
        threadId,
        userId: user.id,
        prompt,
      },
    );

    await ctx.scheduler.runAfter(
      0,
      internal.agents.chat.generateResponse,
      {
        threadId,
        promptMessageId: messageId,
      },
    );

    return {
      threadId,
      messageId,
      messageOrder: message.order,
    };
  },
});

/**
 * Runs outside the mutation so the LLM call doesn't block the mutation.
 */
export const generateResponse = internalAction({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
  },

  handler: async (ctx, args) => {
    const result = await witnessAgent.streamText(
      ctx,
      {
        threadId: args.threadId,
      },
      {
        promptMessageId: args.promptMessageId,
      },
      {
        saveStreamDeltas: {
          chunking: "word",
          throttleMs: 100,
        },
      },
    );

    await result.consumeStream();
  },
});

/**
 * Fetch persisted messages + active stream deltas.
 */
export const listMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },

  handler: async (ctx, args) => {
    
    if (!args.threadId) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
        streams: {
          kind: "list" as const,
          messages: [],
        },
      };
    }
    await authorizeThreadAccess(ctx, args.threadId);

    const paginated = await listUIMessages(
      ctx,
      components.agent,
      args,
    );

    const streams = await syncStreams(
      ctx,
      components.agent,
      args,
    );

    return {
      ...paginated,
      streams,
    };
  },
});