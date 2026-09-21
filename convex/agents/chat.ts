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
    const userId = user._id;
    const now = Date.now();

    let threadId = args.threadId;
    let caseId;
    let agentId;

    if (!threadId) {
      const caseTitle = prompt.length > 40
          ? `${prompt.slice(0, 27)}...`
          : prompt;

      caseId = await ctx.db.insert("cases", {
        userId,
        title: caseTitle,
        originalPrompt: prompt,
        status: "active",
        updatedAt: now,
      });

      agentId = await ctx.db.insert("agents", {
        userId,
        caseId,
        name: "Witness",
        task: prompt,
        status: "running",
        updatedAt: now,
      });

      threadId = await createThread(
        ctx,
        components.agent,
        {
          userId,
          title: caseTitle,
        },
      );

      await ctx.db.insert("agentThreads", {
        userId,
        caseId,
        agentId,
        externalThreadId: threadId,
        updatedAt: now,
      });

      const caseActivityId = await ctx.db.insert(
        "caseActivities",
        {
          userId,
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
          activityId: caseActivityId,
          threadId,
          prompt,
          displayUsername:
            user.displayUsername ??
            user.name ??
            user._id,
        },
      );

      // await ctx.db.insert("caseBlocks", {
      //   userId,
      //   caseId,
      //   type: "narrative",
      //   order: 1000,
      //   text: prompt,
      //   createdAt: now,
      //   updatedAt: now,
      // });
      
    } else {
      await authorizeThreadAccess(ctx, threadId);

      const applicationThread = await ctx.db
        .query("agentThreads")
        .withIndex(
          "by_external_thread_id",
          (q) =>
            q.eq(
              "externalThreadId",
              threadId!,
            ),
        )
        .unique();

      if (
        !applicationThread ||
        applicationThread.userId !== userId
      ) {
        throw new Error(
          "Conversation is not linked to a Case.",
        );
      }

      caseId = applicationThread.caseId;
      agentId = applicationThread.agentId;

      await ctx.db.patch(
        applicationThread._id,
        {
          updatedAt: now,
        },
      );

      await ctx.db.patch(
        applicationThread.caseId,
        {
          updatedAt: now,
        },
      );
    }

    const { messageId, message } = await saveMessage(
      ctx,
      components.agent,
      {
        threadId,
        userId,
        prompt,
      },
    );

    await ctx.scheduler.runAfter(
      0,
      internal.agents.chat.generateResponse,
      {
        threadId,
        promptMessageId: messageId,
        caseId,
        agentId,
      },
    );

    return {
      threadId,
      messageId,
      messageOrder: message.order,
      caseId,
      agentId,
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
    caseId: v.id("cases"),
    agentId: v.id("agents"),
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

    /*
     * Important:
     * Wait until the Agent generation has completely finished.
     *
     * The response is persisted as part of the Agent's streaming lifecycle.
     */
    await result.consumeStream();

    /*
     * The generated response is now available from the result.
     * We pass it directly to the Case summarizer rather than scheduling
     * a summarizer before the Agent has finished.
     */
    const responseText = await result.text;

    if (!responseText?.trim()) {
      return;
    }

    await ctx.scheduler.runAfter(
      0,
      internal.cases.summarize.summarizeAgentResponse,
      {
        caseId: args.caseId,
        agentId: args.agentId,
        threadId: args.threadId,
        promptMessageId: args.promptMessageId,
        responseText: responseText.trim(),
      },
    );
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