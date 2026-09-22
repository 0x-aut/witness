import { createTool } from "@convex-dev/agent";
import { z } from "zod/v4";
import { v } from "convex/values";

import {
  internal,
} from "../../_generated/api";

import {
  internalMutation,
  internalQuery,
} from "../../_generated/server";

import type { Id } from "../../_generated/dataModel";

/* -------------------------------------------------------------------------- */
/* User interaction                                                           */
/* -------------------------------------------------------------------------- */

export const requestUserAction = internalMutation({
  args: {
    userId: v.string(),
    threadId: v.string(),

    type: v.union(
      v.literal("upload_file"),
      v.literal("question"),
      v.literal("approval"),
    ),

    prompt: v.string(),

    options: v.optional(
      v.array(v.string()),
    ),

    metadata: v.optional(v.any()),
  },

  handler: async (
    ctx,
    args,
  ): Promise<{
    actionId: Id<"userActions">;
    inboxItemId: Id<"inboxItems">;
    widgetId: Id<"caseWidgets">;
  }> => {
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

    if (!thread.caseId) {
      throw new Error(
        "The Agent must be attached to a Case before requesting user action.",
      );
    }

    const agent = await ctx.db.get(
      thread.agentId,
    );

    if (
      !agent ||
      agent.userId !== args.userId ||
      agent.caseId !== thread.caseId
    ) {
      throw new Error(
        "Agent not found.",
      );
    }

    const caseData = await ctx.db.get(
      thread.caseId,
    );

    if (
      !caseData ||
      caseData.userId !== args.userId
    ) {
      throw new Error(
        "Case not found.",
      );
    }

    const prompt = args.prompt.trim();

    if (!prompt) {
      throw new Error(
        "User action prompt cannot be empty.",
      );
    }

    const now = Date.now();

    const actionId = await ctx.db.insert(
      "userActions",
      {
        userId: args.userId,
        caseId: thread.caseId,
        agentId: thread.agentId,
        type: args.type,
        prompt,
        status: "pending",
        metadata: {
          ...(args.metadata ?? {}),
          options: args.options ?? [],
        },
      },
    );

    const titleMap = {
      upload_file: "Witness needs a document",
      question: "Witness needs an answer",
      approval: "Witness needs your approval",
    };

    const title = titleMap[args.type];

    const inboxItemId = await ctx.db.insert(
      "inboxItems",
      {
        userId: args.userId,
        caseId: thread.caseId,
        agentId: thread.agentId,
        types: "notification",
        title,
        preview: prompt,
        content: prompt,
        read: false,
        starred: false,
        source: "witness",
        externalId: String(actionId),
        updatedAt: now,
      },
    );

    const widgetType =
      args.type === "approval"
        ? "approval"
        : args.type === "question"
          ? "question"
          : "action";

    const widgetId = await ctx.db.insert(
      "caseWidgets",
      {
        userId: args.userId,
        caseId: thread.caseId,
        type: widgetType,
        data: {
          actionId,
          actionType: args.type,
          prompt,
          options: args.options ?? [],
          status: "pending",
          metadata: args.metadata ?? null,
        },
        createdAt: now,
        updatedAt: now,
      },
    );

    /*
     * User-action widgets follow the same Case document grouping rules
     * as other widgets. Consecutive widgets belong to one widget block.
     */
    const latestBlock = await ctx.db
      .query("caseBlocks")
      .withIndex(
        "by_case_id_order",
        q =>
          q.eq(
            "caseId",
            thread.caseId!,
          ),
      )
      .order("desc")
      .first();

    if (
      latestBlock &&
      latestBlock.type === "widget"
    ) {
      await ctx.db.patch(
        latestBlock._id,
        {
          widgetIds: [
            ...(latestBlock.widgetIds ?? []),
            widgetId,
          ],
          updatedAt: now,
        },
      );
    } else {
      await ctx.db.insert(
        "caseBlocks",
        {
          userId: args.userId,
          caseId: thread.caseId,
          type: "widget",
          order: latestBlock
            ? latestBlock.order + 1000
            : 1000,
          widgetIds: [widgetId],
          createdAt: now,
          updatedAt: now,
        },
      );
    }

    await ctx.db.patch(
      thread.agentId,
      {
        status: "needs_user_action",
        updatedAt: now,
      },
    );

    await ctx.db.patch(
      thread.caseId,
      {
        status: "waiting_user",
        updatedAt: now,
      },
    );

    await ctx.db.insert(
      "caseActivities",
      {
        userId: args.userId,
        caseId: thread.caseId,
        agentId: thread.agentId,
        type: "user_action",
        title,
        description: prompt,
        metadata: {
          actionId,
          actionType: args.type,
        },
        createdAt: now,
      },
    );

    return {
      actionId,
      inboxItemId,
      widgetId,
    };
  },
});

/* -------------------------------------------------------------------------- */
/* User interaction tool                                                      */
/* -------------------------------------------------------------------------- */

export const askUser = createTool({
  description: `
Pause meaningful Case work and ask the user for something that is required
to continue.

Use this only when Witness genuinely needs:
- an answer to a question,
- approval before taking an action,
- or a document/file.

For questions and approvals, provide concise selectable options whenever
possible.

Do not use this for information that Witness can reasonably determine
itself.
`.trim(),

  inputSchema: z.object({
    type: z.enum([
      "question",
      "approval",
      "upload_file",
    ]),

    prompt: z
      .string()
      .min(2)
      .max(1000),

    options: z
      .array(
        z.string().min(1).max(100),
      )
      .max(6)
      .optional(),

    metadata: z
      .record(
        z.string(),
        z.unknown(),
      )
      .optional(),
  }),

  execute: async (
    ctx,
    input,
  ): Promise<unknown> => {
    if (!ctx.userId || !ctx.threadId) {
      throw new Error(
        "Missing Agent context.",
      );
    }

    return await ctx.runMutation(
      internal.agents.tools.work.requestUserAction,
      {
        userId: ctx.userId,
        threadId: ctx.threadId,
        type: input.type,
        prompt: input.prompt,
        options: input.options,
        metadata: input.metadata,
      },
    );
  },
});

/* -------------------------------------------------------------------------- */
/* Case files                                                                  */
/* -------------------------------------------------------------------------- */

export const listCaseFiles = internalQuery({
  args: {
    userId: v.string(),
    caseId: v.id("cases"),
  },

  handler: async (
    ctx,
    args,
  ): Promise<Array<{
    id: Id<"files">;
    filename: string;
    mimeType: string;
    size: number;
    createdAt: number;
  }>> => {
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

    const files = await ctx.db
      .query("files")
      .withIndex(
        "by_case_id",
        q =>
          q.eq(
            "caseId",
            args.caseId,
          ),
      )
      .collect();

    return files.map(file => ({
      id: file._id,
      filename: file.filename,
      mimeType: file.mimeType,
      size: file.size,
      createdAt: file._creationTime,
      parseStatus: file.parseStatus ?? "pending",
      parsed: file.parseStatus === "parsed",
      parsedSummary: file.parsedSummary ?? null,
    }));
  },
});

export const getCaseFiles = createTool({
  description: `
  List documents already attached to a Case.
  
  Use this before asking the user for a document so you can determine
  whether the required evidence is already available.
  
  When a relevant document exists and you need its actual contents,
  use parseDocument with the returned file ID.
`.trim(),

  inputSchema: z.object({
    caseId: z.string(),
  }),

  execute: async (
    ctx,
    input,
  ): Promise<unknown> => {
    if (!ctx.userId) {
      throw new Error(
        "Missing authenticated user.",
      );
    }

    return await ctx.runQuery(
      internal.agents.tools.work.listCaseFiles,
      {
        userId: ctx.userId,
        caseId:
          input.caseId as Id<"cases">,
      },
    );
  },
});