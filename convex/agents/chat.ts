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
  abortStream,
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

export const generateUploadUrl = mutation({
  args: {},

  handler: async ctx => {
    await getCurrentUser(ctx);

    return await ctx.storage.generateUploadUrl();
  },
});

export const resolveUserAction = mutation({
  args: {
    actionId: v.id("userActions"),
    response: v.optional(v.string()),
    files: v.optional(
      v.array(
        v.object({
          storageId: v.id("_storage"),
          filename: v.string(),
          mimeType: v.string(),
          size: v.number(),
        }),
      ),
    ),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const now = Date.now();

    const action = await ctx.db.get(
      args.actionId,
    );

    if (
      !action ||
      action.userId !== user._id
    ) {
      throw new Error("User action not found.");
    }

    if (action.status !== "pending") {
      throw new Error(
        "This user action has already been resolved.",
      );
    }

    const agent = await ctx.db.get(
      action.agentId,
    );

    const caseData = await ctx.db.get(
      action.caseId,
    );

    if (
      !agent ||
      agent.userId !== user._id ||
      !caseData ||
      caseData.userId !== user._id
    ) {
      throw new Error(
        "Invalid Case or Agent.",
      );
    }

    if (
      action.type === "upload_file" &&
      (!args.files || !args.files.length)
    ) {
      throw new Error(
        "At least one document is required.",
      );
    }

    if (
      action.type !== "upload_file" &&
      !args.response?.trim()
    ) {
      throw new Error(
        "A response is required.",
      );
    }

    const fileIds = [];

    for (const file of args.files ?? []) {
      const fileId = await ctx.db.insert(
        "files",
        {
          userId: user._id,
          caseId: action.caseId,
          agentId: action.agentId,
          storageId: file.storageId,
          filename: file.filename,
          mimeType: file.mimeType,
          size: file.size,
        },
      );

      fileIds.push(fileId);
    }

    const response =
      args.response?.trim() ||
      `Uploaded: ${(args.files ?? [])
        .map(file => file.filename)
        .join(", ")}`;

    await ctx.db.patch(
      action._id,
      {
        status: "completed",
        response,
        metadata: {
          ...(action.metadata ?? {}),
          fileIds,
        },
        completedAt: now,
      },
    );

    const inboxItems = await ctx.db
      .query("inboxItems")
      .withIndex(
        "by_case_id",
        q =>
          q.eq(
            "caseId",
            action.caseId,
          ),
      )
      .collect();

    const inboxItem = inboxItems.find(
      item =>
        item.externalId ===
        String(action._id),
    );

    if (inboxItem) {
      await ctx.db.patch(
        inboxItem._id,
        {
          read: true,
          updatedAt: now,
        },
      );
    }

    const widgets = await ctx.db
      .query("caseWidgets")
      .withIndex(
        "by_case_id",
        q =>
          q.eq(
            "caseId",
            action.caseId,
          ),
      )
      .collect();

    const actionWidget = widgets.find(
      widget =>
        widget.data &&
        typeof widget.data === "object" &&
        widget.data.actionId ===
          action._id,
    );

    if (actionWidget) {
      await ctx.db.patch(
        actionWidget._id,
        {
          data: {
            ...actionWidget.data,
            status: "completed",
            response,
            fileIds,
          },
          updatedAt: now,
        },
      );
    }

    await ctx.db.patch(
      action.agentId,
      {
        status: "running",
        updatedAt: now,
      },
    );

    await ctx.db.patch(
      action.caseId,
      {
        status: "active",
        updatedAt: now,
      },
    );

    await ctx.db.insert(
      "caseActivities",
      {
        userId: user._id,
        caseId: action.caseId,
        agentId: action.agentId,
        type: "user_action",
        title: "User responded",
        description: response,
        metadata: {
          actionId: action._id,
          fileIds,
        },
        createdAt: now,
      },
    );

    /*
     * Continue the same Agent thread with the user's response.
     */
    const { messageId, message } =
      await saveMessage(
        ctx,
        components.agent,
        {
          threadId:
            (
              await ctx.db
                .query("agentThreads")
                .withIndex(
                  "by_agent_id",
                  q =>
                    q.eq(
                      "agentId",
                      action.agentId,
                    ),
                )
                .order("desc")
                .first()
            )?.externalThreadId!,
          userId: user._id,
          prompt: response,
        },
      );

    const thread = await ctx.db
      .query("agentThreads")
      .withIndex(
        "by_agent_id",
        q =>
          q.eq(
            "agentId",
            action.agentId,
          ),
      )
      .order("desc")
      .first();

    if (!thread?.externalThreadId) {
      throw new Error(
        "Agent thread not found.",
      );
    }

    await ctx.scheduler.runAfter(
      0,
      internal.agents.chat.generateResponse,
      {
        threadId:thread.externalThreadId,
        promptMessageId: messageId,
        agentId: action.agentId,
      },
    );

    return {
      actionId: action._id,
      messageOrder: message.order,
    };
  },
});

export const getPendingUserAction = query({
  args: {
    threadId: v.string(),
  },

  handler: async (ctx, args) => {
    if (!args.threadId) {
      return null;
    }

    await authorizeThreadAccess(
      ctx,
      args.threadId,
    );

    const applicationThread = await ctx.db
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

    if (!applicationThread) {
      return null;
    }

    const actions = await ctx.db
      .query("userActions")
      .withIndex(
        "by_agent_id",
        q =>
          q.eq(
            "agentId",
            applicationThread.agentId,
          ),
      )
      .order("desc")
      .take(20);

    const action = actions.find(
      item => item.status === "pending",
    );

    if (!action) {
      return null;
    }

    const metadata =
      action.metadata &&
      typeof action.metadata === "object"
        ? action.metadata as Record<string, unknown>
        : {};

    const options =
      Array.isArray(metadata.options)
        ? metadata.options.filter(
            (value): value is string =>
              typeof value === "string",
          )
        : [];

    return {
      id: action._id,
      caseId: action.caseId,
      agentId: action.agentId,
      type: action.type,
      prompt: action.prompt,
      options,
      metadata,
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

      const agent = await ctx.runQuery(
        internal.agents.chat.getAgentState,
        {
          agentId: args.agentId,
        },
      );
      
      if (!agent || agent.status !== "running") {
        return;
      }
      
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


export const getAgentState = internalQuery({
  args: {
    agentId: v.id("agents"),
  },

  handler: async (ctx, args) => {
    return await ctx.db.get(
      args.agentId,
    );
  },
});

export const cancelGeneration = mutation({
  args: {
    threadId: v.string(),
    order: v.optional(v.number()),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    await authorizeThreadAccess(
      ctx,
      args.threadId,
    );

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

    if (!thread) {
      return {
        success: false,
      };
    }

    const agent = await ctx.db.get(
      thread.agentId,
    );

    if (
      !agent ||
      agent.userId !== user._id
    ) {
      throw new Error(
        "Agent not found.",
      );
    }

    if (args.order !== undefined) {
      await abortStream(
        ctx,
        components.agent,
        {
          threadId: args.threadId,
          order: args.order,
          reason: "User stopped Witness.",
        },
      );
    }

    const pendingActions = await ctx.db
      .query("userActions")
      .withIndex(
        "by_agent_id",
        q =>
          q.eq(
            "agentId",
            thread.agentId,
          ),
      )
      .collect();

    const pendingAction =
      pendingActions.find(
        action =>
          action.status === "pending",
      );

    if (pendingAction) {
      await ctx.db.patch(
        pendingAction._id,
        {
          status: "cancelled",
        },
      );

      const widgets = await ctx.db
        .query("caseWidgets")
        .withIndex(
          "by_case_id",
          q =>
            q.eq(
              "caseId",
              pendingAction.caseId,
            ),
        )
        .collect();

      const actionWidget = widgets.find(
        widget =>
          widget.data &&
          typeof widget.data === "object" &&
          widget.data.actionId ===
            pendingAction._id,
      );

      if (actionWidget) {
        await ctx.db.patch(
          actionWidget._id,
          {
            data: {
              ...actionWidget.data,
              status: "cancelled",
            },
            updatedAt: Date.now(),
          },
        );
      }
    }

    await ctx.db.patch(
      thread.agentId,
      {
        status: "stopped",
        updatedAt: Date.now(),
      },
    );

    if (thread.caseId) {
      await ctx.db.patch(
        thread.caseId,
        {
          status: "active",
          updatedAt: Date.now(),
        },
      );
    }

    return {
      success: true,
    };
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

    if (
      !agent ||
      agent.status === "stopped" ||
      agent.status === "needs_user_action"
    ) {
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