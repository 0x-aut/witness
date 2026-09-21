import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";

import { internal, components } from "../_generated/api";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

import {
  createThread,
  listUIMessages,
  saveMessage,
  syncStreams,
  vStreamArgs,
} from "@convex-dev/agent";

import {
  authorizeThreadAccess,
  getCurrentUser,
} from "./threads";

import { witnessAgent } from "./witness";

/**
 * Creates/retrieves the application Agent + Thread and persists
 * the user's message before scheduling generation.
 *
 * A Case is intentionally NOT created here.
 * Witness decides whether the conversation needs one.
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
    const displayUsername = user.displayUsername as string;
    const now = Date.now();

    let threadId = args.threadId;
    let agentId;

    if (!threadId) {
      const title =
        prompt.length > 30
          ? `${prompt.slice(0, 20)}...`
          : `${prompt}...`;

      // Spawn the Witness Agent for this conversation.
      agentId = await ctx.db.insert("agents", {
        userId,
        name: "Witness",
        title: title,
        task: prompt,
        status: "running",
        updatedAt: now,
      });

      // Create the Convex Agent thread.
      threadId = await createThread(
        ctx,
        components.agent,
        {
          userId,
          title,
        },
      );

      // Link our application Agent to the Convex Agent thread.
      await ctx.db.insert("agentThreads", {
        userId,
        agentId,
        externalThreadId: threadId,
        updatedAt: now,
      });
    } else {
      await authorizeThreadAccess(ctx, threadId);

      const applicationThread = await ctx.db
        .query("agentThreads")
        .withIndex(
          "by_external_thread_id",
          q => q.eq(
            "externalThreadId",
            threadId!,
          ),
        )
        .unique();

      if (
        !applicationThread ||
        applicationThread.userId !== userId
      ) {
        throw new Error("Conversation not found.");
      }

      agentId = applicationThread.agentId;

      // Re-activate the Agent for the new turn.
      await ctx.db.patch(applicationThread.agentId, {
        status: "running",
        updatedAt: now,
      });

      await ctx.db.patch(applicationThread._id, {
        updatedAt: now,
      });

      // Keep an attached Case fresh when one exists.
      if (applicationThread.caseId) {
        await ctx.db.patch(applicationThread.caseId, {
          updatedAt: now,
        });
      }
    }

    ctx.scheduler.runAfter(
      0,
      internal.agents.summarize.summarizeInitial,
      {
        agentId,
        threadId,
        prompt,
        displayUsername,
      },
    );

    if (!agentId) {
      throw new Error("Agent could not be initialized.");
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
        agentId,
      },
    );

    // Return current Case association, if any.
    const applicationThread = await ctx.db
      .query("agentThreads")
      .withIndex(
        "by_external_thread_id",
        q => q.eq(
          "externalThreadId",
          threadId!,
        ),
      )
      .unique();

    return {
      threadId,
      messageId,
      messageOrder: message.order,
      agentId,
      caseId: applicationThread?.caseId ?? null,
    };
  },
});

/**
 * Internal lookup used after an Agent turn because the Agent may have
 * attached itself to a Case through one of its tools.
 */
export const getApplicationThread = internalQuery({
  args: {
    threadId: v.string(),
  },

  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentThreads")
      .withIndex(
        "by_external_thread_id",
        q => q.eq(
          "externalThreadId",
          args.threadId,
        ),
      )
      .unique();
  },
});

/**
 * Runs the actual Witness Agent outside the mutation.
 *
 * The Agent itself is responsible for deciding whether it needs to:
 * - remain a normal conversation,
 * - inspect existing Cases,
 * - enter an existing Case,
 * - or create a new Case.
 */
export const generateResponse = internalAction({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
    agentId: v.id("agents"),
  },

  handler: async (ctx, args) => {
    try {
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

      // Wait until the complete Agent turn has finished.
      await result.consumeStream();

      const responseText = await result.text;

      /*
       * The Agent may have created or entered a Case while it was
       * running tools, so resolve the relationship AFTER execution.
       */
      const applicationThread = await ctx.runQuery(
        internal.agents.chat.getApplicationThread,
        {
          threadId: args.threadId,
        },
      );

      const caseId =
        applicationThread?.caseId ?? null;

      if (responseText?.trim() && caseId) {
        await ctx.scheduler.runAfter(
          0,
          internal.cases.summarize.summarizeAgentResponse,
          {
            caseId,
            agentId: args.agentId,
            threadId: args.threadId,
            promptMessageId: args.promptMessageId,
            responseText: responseText.trim(),
          },
        );
      }

      await ctx.runMutation(
        internal.agents.chat.finishAgent,
        {
          agentId: args.agentId,
          status: "finished",
        },
      );
    } catch (error) {
      await ctx.runMutation(
        internal.agents.chat.finishAgent,
        {
          agentId: args.agentId,
          status: "error",
        },
      );

      throw error;
    }
  },
});


/**
 * Internal Agent status update.
 */
export const finishAgent = internalMutation({
  args: {
    agentId: v.id("agents"),
    status: v.union(
      v.literal("finished"),
      v.literal("error"),
    ),
  },

  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);

    if (!agent) {
      return;
    }

    await ctx.db.patch(args.agentId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    if (agent.caseId) {
      await ctx.db.patch(agent.caseId, {
        updatedAt: Date.now(),
      });
    }
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

    await authorizeThreadAccess(
      ctx,
      args.threadId,
    );

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