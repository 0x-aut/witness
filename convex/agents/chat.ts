import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";

import {
  internal,
  components,
} from "../_generated/api";

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

/* -------------------------------------------------------------------------- */
/* Conversation                                                               */
/* -------------------------------------------------------------------------- */

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
      throw new Error(
        "Prompt cannot be empty.",
      );
    }

    const user = await getCurrentUser(ctx);

    const userId = user._id;

    const displayUsername =
      (
        user.displayUsername ??
        user.name ??
        "there"
      ) as string;

    const now = Date.now();

    let threadId = args.threadId;
    let agentId;

    if (!threadId) {
      const title =
        prompt.length > 30
          ? `${prompt.slice(0, 20)}...`
          : `${prompt}...`;

      /*
       * Create the application Agent first.
       */
      agentId = await ctx.db.insert(
        "agents",
        {
          userId,
          name: "Witness",
          title,
          task: prompt,
          status: "running",
          updatedAt: now,
        },
      );

      /*
       * Create the Convex Agent thread.
       */
      threadId = await createThread(
        ctx,
        components.agent,
        {
          userId,
          title,
        },
      );

      /*
       * Link the application Agent to the
       * Convex Agent thread.
       */
      await ctx.db.insert(
        "agentThreads",
        {
          userId,
          agentId,
          externalThreadId: threadId,
          updatedAt: now,
        },
      );

      /*
       * Generate the initial Agent title.
       * Case creation itself has its own Case summarizer.
       */
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
    } else {
      await authorizeThreadAccess(
        ctx,
        threadId,
      );

      const applicationThread =
        await ctx.db
          .query("agentThreads")
          .withIndex(
            "by_external_thread_id",
            q =>
              q.eq(
                "externalThreadId",
                threadId!,
              ),
          )
          .unique();

      if (
        !applicationThread ||
        applicationThread.userId !==
          userId
      ) {
        throw new Error(
          "Conversation not found.",
        );
      }

      agentId =
        applicationThread.agentId;

      /*
       * A new user turn always reactivates
       * the application Agent.
       */
      await ctx.db.patch(
        applicationThread.agentId,
        {
          status: "running",
          updatedAt: now,
        },
      );

      await ctx.db.patch(
        applicationThread._id,
        {
          updatedAt: now,
        },
      );

      if (
        applicationThread.caseId
      ) {
        await ctx.db.patch(
          applicationThread.caseId,
          {
            updatedAt: now,
          },
        );
      }
    }

    if (!agentId || !threadId) {
      throw new Error(
        "Agent could not be initialized.",
      );
    }

    /*
     * Persist the user message BEFORE scheduling generation.
     * Its order becomes the identity of this generation.
     */
    const {
      messageId,
      message,
    } = await saveMessage(
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
        promptMessageId:
          messageId,
        promptOrder:
          message.order,
        agentId,
      },
    );

    const applicationThread =
      await ctx.db
        .query("agentThreads")
        .withIndex(
          "by_external_thread_id",
          q =>
            q.eq(
              "externalThreadId",
              threadId!,
            ),
        )
        .unique();

    return {
      threadId,
      messageId,
      messageOrder:
        message.order,
      agentId,
      caseId:
        applicationThread?.caseId ??
        null,
    };
  },
});

/* -------------------------------------------------------------------------- */
/* File upload                                                                */
/* -------------------------------------------------------------------------- */

export const generateUploadUrl =
  mutation({
    args: {},

    handler: async ctx => {
      await getCurrentUser(ctx);

      return await ctx.storage.generateUploadUrl();
    },
  });

/* -------------------------------------------------------------------------- */
/* Resolve user action                                                        */
/* -------------------------------------------------------------------------- */

export const resolveUserAction =
  mutation({
    args: {
      actionId:
        v.id("userActions"),

      response: v.optional(
        v.string(),
      ),

      files: v.optional(
        v.array(
          v.object({
            storageId:
              v.id("_storage"),
            filename: v.string(),
            mimeType: v.string(),
            size: v.number(),
          }),
        ),
      ),
    },

    handler: async (ctx, args) => {
      const user =
        await getCurrentUser(ctx);

      const now = Date.now();

      const action =
        await ctx.db.get(
          args.actionId,
        );

      if (
        !action ||
        action.userId !== user._id
      ) {
        throw new Error(
          "User action not found.",
        );
      }

      if (
        action.status !== "pending"
      ) {
        throw new Error(
          "This user action has already been resolved.",
        );
      }

      const agent =
        await ctx.db.get(
          action.agentId,
        );

      const caseData =
        await ctx.db.get(
          action.caseId,
        );

      if (
        !agent ||
        agent.userId !== user._id ||
        !caseData ||
        caseData.userId !==
          user._id
      ) {
        throw new Error(
          "Invalid Case or Agent.",
        );
      }

      /*
       * Upload actions require actual files.
       */
      if (
        action.type ===
          "upload_file" &&
        (!args.files ||
          args.files.length === 0)
      ) {
        throw new Error(
          "At least one document is required.",
        );
      }

      /*
       * Other action types require a response.
       */
      if (
        action.type !==
          "upload_file" &&
        !args.response?.trim()
      ) {
        throw new Error(
          "A response is required.",
        );
      }

      /*
       * Resolve the application Agent thread.
       */
      const thread =
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
          .first();

      if (
        !thread?.externalThreadId
      ) {
        throw new Error(
          "Agent thread not found.",
        );
      }

      if (
        thread.userId !==
          user._id ||
        thread.caseId !==
          action.caseId
      ) {
        throw new Error(
          "Invalid Agent thread.",
        );
      }

      /*
       * Store uploaded files in the application's
       * files table and create Case document widgets.
       */
      const fileIds: Array<
        any
      > = [];

      let latestWidgetBlock =
        await ctx.db
          .query("caseBlocks")
          .withIndex(
            "by_case_id_order",
            q =>
              q.eq(
                "caseId",
                action.caseId,
              ),
          )
          .order("desc")
          .first();

      const documentWidgetIds: Array<
        any
      > = [];

      for (const file of
        args.files ?? []) {
        const fileId =
          await ctx.db.insert(
            "files",
            {
              userId: user._id,
              caseId:
                action.caseId,
              agentId:
                action.agentId,
              storageId:
                file.storageId,
              filename:
                file.filename,
              mimeType:
                file.mimeType,
              size: file.size,
            },
          );

        fileIds.push(fileId);

        const widgetId =
          await ctx.db.insert(
            "caseWidgets",
            {
              userId:
                user._id,
              caseId:
                action.caseId,
              type: "document",
              data: {
                fileId,
                storageId:
                  file.storageId,
                filename:
                  file.filename,
                mimeType:
                  file.mimeType,
                size: file.size,
              },
              createdAt: now,
              updatedAt: now,
            },
          );

        documentWidgetIds.push(
          widgetId,
        );
      }

      /*
       * Consecutive widgets stay in the same widget block.
       */
      if (
        documentWidgetIds.length
      ) {
        if (
          latestWidgetBlock?.type ===
          "widget"
        ) {
          await ctx.db.patch(
            latestWidgetBlock._id,
            {
              widgetIds: [
                ...(latestWidgetBlock.widgetIds ??
                  []),
                ...documentWidgetIds,
              ],
              updatedAt: now,
            },
          );
        } else {
          await ctx.db.insert(
            "caseBlocks",
            {
              userId: user._id,
              caseId:
                action.caseId,
              type: "widget",
              order:
                latestWidgetBlock
                  ? latestWidgetBlock.order +
                    1000
                  : 1000,
              widgetIds:
                documentWidgetIds,
              createdAt: now,
              updatedAt: now,
            },
          );
        }
      }

      const response =
        args.response?.trim() ||
        `Uploaded: ${(args.files ?? [])
          .map(
            file =>
              file.filename,
          )
          .join(", ")}`;

      /*
       * Complete the user action.
       */
      await ctx.db.patch(
        action._id,
        {
          status:
            "completed",
          response,
          metadata: {
            ...(action.metadata ??
              {}),
            fileIds,
          },
          completedAt: now,
        },
      );

      /*
       * Mark the corresponding Inbox item read.
       */
      const inboxItems =
        await ctx.db
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

      const inboxItem =
        inboxItems.find(
          item =>
            item.externalId ===
            String(
              action._id,
            ),
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

      /*
       * Update the original action widget.
       */
      const widgets =
        await ctx.db
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

      const actionWidget =
        widgets.find(
          widget =>
            widget.data &&
            typeof widget.data ===
              "object" &&
            widget.data.actionId ===
              action._id,
        );

      if (actionWidget) {
        await ctx.db.patch(
          actionWidget._id,
          {
            data: {
              ...actionWidget.data,
              status:
                "completed",
              response,
              fileIds,
            },
            updatedAt: now,
          },
        );
      }

      /*
       * Wake the Agent back up BEFORE scheduling
       * the resumed generation.
       */
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
          caseId:
            action.caseId,
          agentId:
            action.agentId,
          type:
            "user_action",
          title:
            "User uploaded documents",
          description:
            response,
          metadata: {
            actionId:
              action._id,
            fileIds,
          },
          createdAt:
            now,
        },
      );

      /*
       * IMPORTANT:
       *
       * This creates a NEW user turn in the same Agent thread.
       * The resulting message order becomes the identity of the
       * resumed generation.
       */
      const {
        messageId,
        message,
      } = await saveMessage(
        ctx,
        components.agent,
        {
          threadId:
            thread.externalThreadId,
          userId:
            user._id,
          prompt:
            response,
        },
      );

      await ctx.scheduler.runAfter(
        0,
        internal.agents.chat
          .generateResponse,
        {
          threadId:
            thread.externalThreadId,
          promptMessageId:
            messageId,
          promptOrder:
            message.order,
          agentId:
            action.agentId,
        },
      );

      return {
        actionId:
          action._id,
        fileIds,
        messageId,
        messageOrder:
          message.order,
      };
    },
  });

/* -------------------------------------------------------------------------- */
/* Decline user action                                                        */
/* -------------------------------------------------------------------------- */

export const declineUserAction =
  mutation({
    args: {
      actionId:
        v.id("userActions"),
    },

    handler: async (ctx, args) => {
      const user =
        await getCurrentUser(ctx);

      const now = Date.now();

      const action =
        await ctx.db.get(
          args.actionId,
        );

      if (
        !action ||
        action.userId !== user._id
      ) {
        throw new Error(
          "User action not found.",
        );
      }

      if (
        action.status !== "pending"
      ) {
        throw new Error(
          "This user action has already been resolved.",
        );
      }

      const agent =
        await ctx.db.get(
          action.agentId,
        );

      const caseData =
        await ctx.db.get(
          action.caseId,
        );

      if (
        !agent ||
        agent.userId !== user._id ||
        !caseData ||
        caseData.userId !==
          user._id
      ) {
        throw new Error(
          "Invalid Case or Agent.",
        );
      }

      const thread =
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
          .first();

      if (
        !thread?.externalThreadId
      ) {
        throw new Error(
          "Agent thread not found.",
        );
      }

      if (
        thread.userId !==
          user._id ||
        thread.caseId !==
          action.caseId
      ) {
        throw new Error(
          "Invalid Agent thread.",
        );
      }

      /*
       * Cancel ONLY the user action.
       *
       * This is deliberately NOT cancelGeneration().
       * The Agent should continue working.
       */
      await ctx.db.patch(
        action._id,
        {
          status: "cancelled",
          completedAt: now,
        },
      );

      /*
       * Mark the Inbox item read.
       */
      const inboxItems =
        await ctx.db
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

      const inboxItem =
        inboxItems.find(
          item =>
            item.externalId ===
            String(
              action._id,
            ),
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

      /*
       * Update the Case action widget.
       */
      const widgets =
        await ctx.db
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

      const actionWidget =
        widgets.find(
          widget =>
            widget.data &&
            typeof widget.data ===
              "object" &&
            widget.data.actionId ===
              action._id,
        );

      if (actionWidget) {
        await ctx.db.patch(
          actionWidget._id,
          {
            data: {
              ...actionWidget.data,
              status:
                "cancelled",
            },
            updatedAt: now,
          },
        );
      }

      /*
       * Re-activate the Agent + Case.
       */
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
          caseId:
            action.caseId,
          agentId:
            action.agentId,
          type:
            "user_action",
          title:
            "User declined the document request",
          description:
            "Witness requested documents, but the user chose to continue without uploading them.",
          metadata: {
            actionId:
              action._id,
            actionType:
              action.type,
            declined: true,
          },
          createdAt:
            now,
        },
      );

      /*
       * Give the Agent an explicit continuation message so it knows
       * the requested evidence is unavailable and should continue.
       */
      const response =
        "I don't have the requested documents right now. Continue without them if you can.";

      const {
        messageId,
        message,
      } = await saveMessage(
        ctx,
        components.agent,
        {
          threadId:
            thread.externalThreadId,
          userId:
            user._id,
          prompt:
            response,
        },
      );

      await ctx.scheduler.runAfter(
        0,
        internal.agents.chat
          .generateResponse,
        {
          threadId:
            thread.externalThreadId,
          promptMessageId:
            messageId,
          promptOrder:
            message.order,
          agentId:
            action.agentId,
        },
      );

      return {
        actionId:
          action._id,
        messageId,
        messageOrder:
          message.order,
      };
    },
  });

/* -------------------------------------------------------------------------- */
/* Pending user action                                                        */
/* -------------------------------------------------------------------------- */

export const getPendingUserAction =
  query({
    args: {
      threadId:
        v.string(),
    },

    handler: async (
      ctx,
      args,
    ) => {
      if (!args.threadId) {
        return null;
      }

      await authorizeThreadAccess(
        ctx,
        args.threadId,
      );

      const applicationThread =
        await ctx.db
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

      const actions =
        await ctx.db
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

      const action =
        actions.find(
          item =>
            item.status ===
            "pending",
        );

      if (!action) {
        return null;
      }

      const metadata =
        action.metadata &&
        typeof action.metadata ===
          "object"
          ? (action.metadata as Record<
              string,
              unknown
            >)
          : {};

      const options =
        Array.isArray(
          metadata.options,
        )
          ? metadata.options.filter(
              (
                value,
              ): value is string =>
                typeof value ===
                "string",
            )
          : [];

      return {
        id: action._id,
        caseId:
          action.caseId,
        agentId:
          action.agentId,
        type:
          action.type,
        prompt:
          action.prompt,
        options,
        metadata,
      };
    },
  });

/* -------------------------------------------------------------------------- */
/* Application thread lookup                                                  */
/* -------------------------------------------------------------------------- */

export const getApplicationThread =
  internalQuery({
    args: {
      threadId:
        v.string(),
    },

    handler: async (
      ctx,
      args,
    ) => {
      return await ctx.db
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
    },
  });

/* -------------------------------------------------------------------------- */
/* Agent generation                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Runs the actual Witness Agent.
 *
 * Every generation carries the order of the user message that started it.
 * This lets finishAgent distinguish the completion of an old generation
 * from a newer generation that was scheduled after an interruption.
 */
export const generateResponse =
  internalAction({
    args: {
      threadId:
        v.string(),

      promptMessageId:
        v.string(),

      promptOrder:
        v.number(),

      agentId:
        v.id("agents"),
    },

    handler: async (
      ctx,
      args,
    ) => {
      try {
        const agent =
          await ctx.runQuery(
            internal.agents.chat
              .getAgentState,
            {
              agentId:
                args.agentId,
            },
          );

        /*
         * A stopped Agent or a generation that was superseded
         * should never start.
         */
        if (
          !agent ||
          agent.status !==
            "running"
        ) {
          return;
        }

        const result =
          await witnessAgent.streamText(
            ctx,
            {
              threadId:
                args.threadId,
            },
            {
              promptMessageId:
                args.promptMessageId,
            },
            {
              saveStreamDeltas: {
                chunking:
                  "word",
                throttleMs:
                  100,
              },
            },
          );

        /*
         * Block until the entire Agent turn has completed.
         */
        await result.consumeStream();

        const responseText =
          await result.text;

        /*
         * The Agent may have created/entered a Case
         * during this generation.
         */
        const applicationThread =
          await ctx.runQuery(
            internal.agents.chat
              .getApplicationThread,
            {
              threadId:
                args.threadId,
            },
          );

        const caseId =
          applicationThread?.caseId ??
          null;

        if (
          responseText?.trim() &&
          caseId
        ) {
          await ctx.scheduler.runAfter(
            0,
            internal.cases.summarize
              .summarizeAgentResponse,
            {
              caseId,
              agentId:
                args.agentId,
              threadId:
                args.threadId,
              promptMessageId:
                args.promptMessageId,
              responseText:
                responseText.trim(),
            },
          );
        }

        /*
         * IMPORTANT:
         *
         * finishAgent checks whether this generation is still
         * the latest user turn. If the user has already responded
         * to askUser and scheduled a newer generation, the old
         * generation cannot mark the new run as finished.
         */
        await ctx.runMutation(
          internal.agents.chat
            .finishAgent,
          {
            agentId:
              args.agentId,
            threadId:
              args.threadId,
            promptOrder:
              args.promptOrder,
            status:
              "finished",
          },
        );
      } catch (error) {
        /*
         * Same stale-generation guard applies to errors.
         * An old generation must not mark a newer resumed generation
         * as errored.
         */
        await ctx.runMutation(
          internal.agents.chat
            .finishAgent,
          {
            agentId:
              args.agentId,
            threadId:
              args.threadId,
            promptOrder:
              args.promptOrder,
            status:
              "error",
          },
        );

        throw error;
      }
    },
  });

/* -------------------------------------------------------------------------- */
/* Agent state                                                                */
/* -------------------------------------------------------------------------- */

export const getAgentState =
  internalQuery({
    args: {
      agentId:
        v.id("agents"),
    },

    handler: async (
      ctx,
      args,
    ) => {
      return await ctx.db.get(
        args.agentId,
      );
    },
  });

/* -------------------------------------------------------------------------- */
/* Generation completion                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Marks a generation finished only if it is still current.
 *
 * Convex Agent allows multiple generations to exist in the same thread.
 * A continuation after askUser creates a newer user order, so an older
 * generateResponse cannot accidentally finish the newer Agent run.
 */
export const finishAgent =
  internalMutation({
    args: {
      agentId:
        v.id("agents"),

      threadId:
        v.string(),

      promptOrder:
        v.number(),

      status: v.union(
        v.literal("finished"),
        v.literal("error"),
      ),
    },

    handler: async (
      ctx,
      args,
    ) => {
      const agent =
        await ctx.db.get(
          args.agentId,
        );

      if (!agent) {
        return;
      }

      /*
       * If another user turn has already been saved after this
       * generation started, this generation is stale.
       */
      const latestMessages =
        await ctx.runQuery(
          components.agent.messages
            .listMessagesByThreadId,
          {
            threadId:
              args.threadId,
            order: "desc",
            paginationOpts: {
              cursor: null,
              numItems: 1,
            },
          },
        );

      const latestOrder =
        latestMessages.page[0]
          ?.order ??
        args.promptOrder;

      if (
        latestOrder >
        args.promptOrder
      ) {
        return;
      }

      /*
       * User explicitly stopped the generation.
       */
      if (
        agent.status ===
        "stopped"
      ) {
        return;
      }

      /*
       * askUser intentionally moved the Agent into
       * needs_user_action. Its old generation must not
       * overwrite that state.
       */
      if (
        agent.status ===
        "needs_user_action"
      ) {
        return;
      }

      /*
       * A newer mutation may have already changed this Agent's state.
       * Only the current running/error state should be finalized.
       */
      if (
        agent.status !==
        "running"
      ) {
        return;
      }

      const now =
        Date.now();

      await ctx.db.patch(
        args.agentId,
        {
          status:
            args.status,
          updatedAt: now,
        },
      );

      if (agent.caseId) {
        await ctx.db.patch(
          agent.caseId,
          {
            updatedAt: now,
          },
        );
      }
    },
  });

/* -------------------------------------------------------------------------- */
/* Cancel generation                                                          */
/* -------------------------------------------------------------------------- */

export const cancelGeneration =
  mutation({
    args: {
      threadId:
        v.string(),

      order:
        v.optional(
          v.number(),
        ),
    },

    handler: async (
      ctx,
      args,
    ) => {
      const user =
        await getCurrentUser(ctx);

      await authorizeThreadAccess(
        ctx,
        args.threadId,
      );

      const thread =
        await ctx.db
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

      const agent =
        await ctx.db.get(
          thread.agentId,
        );

      if (
        !agent ||
        agent.userId !==
          user._id
      ) {
        throw new Error(
          "Agent not found.",
        );
      }

      /*
       * Abort the Convex Agent stream for this generation.
       */
      if (
        args.order !==
        undefined
      ) {
        await abortStream(
          ctx,
          components.agent,
          {
            threadId:
              args.threadId,
            order:
              args.order,
            reason:
              "User stopped Witness.",
          },
        );
      }

      /*
       * If an interruption is currently pending,
       * cancelling the generation also cancels that pending action.
       *
       * This path is only for the explicit "Stop Witness" action,
       * not the upload-request X button.
       */
      const pendingActions =
        await ctx.db
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
            action.status ===
            "pending",
        );

      if (pendingAction) {
        const now =
          Date.now();

        await ctx.db.patch(
          pendingAction._id,
          {
            status:
              "cancelled",
            completedAt:
              now,
          },
        );

        const widgets =
          await ctx.db
            .query(
              "caseWidgets",
            )
            .withIndex(
              "by_case_id",
              q =>
                q.eq(
                  "caseId",
                  pendingAction.caseId,
                ),
            )
            .collect();

        const actionWidget =
          widgets.find(
            widget =>
              widget.data &&
              typeof widget.data ===
                "object" &&
              widget.data.actionId ===
                pendingAction._id,
          );

        if (actionWidget) {
          await ctx.db.patch(
            actionWidget._id,
            {
              data: {
                ...actionWidget.data,
                status:
                  "cancelled",
              },
              updatedAt:
                now,
            },
          );
        }
      }

      await ctx.db.patch(
        thread.agentId,
        {
          status:
            "stopped",
          updatedAt:
            Date.now(),
        },
      );

      if (thread.caseId) {
        await ctx.db.patch(
          thread.caseId,
          {
            status:
              "active",
            updatedAt:
              Date.now(),
          },
        );
      }

      return {
        success: true,
      };
    },
  });

/* -------------------------------------------------------------------------- */
/* Message + stream synchronization                                           */
/* -------------------------------------------------------------------------- */

/**
 * Fetch persisted UI messages + currently streaming deltas.
 *
 * Keep syncStreams on its default "streaming" status here.
 * Finished streams are represented by listUIMessages once persisted,
 * which avoids treating completed streams as active generation.
 */
export const listMessages =
  query({
    args: {
      threadId:
        v.string(),

      paginationOpts:
        paginationOptsValidator,

      streamArgs:
        vStreamArgs,
    },

    handler: async (
      ctx,
      args,
    ) => {
      if (!args.threadId) {
        return {
          page: [],
          isDone: true,
          continueCursor:
            "",
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

      const paginated =
        await listUIMessages(
          ctx,
          components.agent,
          args,
        );

      const streams =
        await syncStreams(
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