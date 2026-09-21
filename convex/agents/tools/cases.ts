import { createTool } from "@convex-dev/agent";
import { z } from "zod/v4";
import { v } from "convex/values";

import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export const getCurrentCase = createTool({
  description: `
Get the Case currently attached to this Agent's conversation.

Use this first when determining whether the current work already belongs
to a Case. Returns null when the conversation is not attached to a Case.
`.trim(),

  inputSchema: z.object({}),

  execute: async (ctx): Promise<unknown> => {
    if (!ctx.threadId) {
      return null;
    }

    return await ctx.runQuery(
      internal.cases.get.getCurrentForAgent,
      {
        userId: ctx.userId,
        threadId: ctx.threadId,
      },
    );
  },
});

export const getCases = createTool({
  description: `
List the user's existing Cases.

Use this when the current conversation is not attached to a Case and you
need to determine whether the user's problem matches an existing Case.
`.trim(),

  inputSchema: z.object({
    status: z
      .enum([
        "active",
        "waiting_user",
        "resolved",
        "archived",
      ])
      .optional(),

    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional(),
  }),

  execute: async (ctx, input): Promise<unknown> => {
    return await ctx.runQuery(
      internal.cases.list.listForAgent,
      {
        userId: ctx.userId,
        status: input.status,
        limit: input.limit ?? 20,
      },
    );
  },
});

export const getCase = createTool({
  description: `
Get detailed context about a Case.

Returns the Case metadata, Agents, recent activity, and the current
Case document including its narrative and widgets.
`.trim(),

  inputSchema: z.object({
    caseId: z.string(),
  }),

  execute: async (ctx, input): Promise<unknown> => {
    return await ctx.runQuery(
      internal.cases.get.getForAgent,
      {
        userId: ctx.userId,
        caseId: input.caseId,
      },
    );
  },
});

export const createCase = createTool({
  description: `
Create a new Case and attach the current Agent conversation to it.

Only use this when the user's problem requires substantial ongoing work,
research, documents, external communication, or user intervention.

Do not create a Case for simple informational questions.
`.trim(),

  inputSchema: z.object({
    title: z
      .string()
      .min(1)
      .max(100),

    originalPrompt: z
      .string()
      .min(1),

    category: z
      .string()
      .max(100)
      .optional(),
  }),

  execute: async (ctx, input): Promise<unknown> => {
    if (!ctx.threadId) {
      throw new Error(
        "Cannot create a Case without an Agent thread.",
      );
    }

    return await ctx.runMutation(
      internal.cases.create.createForAgent,
      {
        userId: ctx.userId,
        threadId: ctx.threadId,
        title: input.title,
        originalPrompt: input.originalPrompt,
        category: input.category,
      },
    );
  },
});

export const enterCase = createTool({
  description: `
Attach the current Agent conversation to an existing Case.

Use this when the user's current request belongs to an existing Case.
Do not create a duplicate Case when an appropriate existing Case already
exists.
`.trim(),

  inputSchema: z.object({
    caseId: z.string(),
  }),

  execute: async (ctx, input): Promise<unknown> => {
    if (!ctx.threadId) {
      throw new Error(
        "Cannot enter a Case without an Agent thread.",
      );
    }

    return await ctx.runMutation(
      internal.cases.attach.enterForAgent,
      {
        userId: ctx.userId,
        threadId: ctx.threadId,
        caseId: input.caseId as Id<"cases">,
      },
    );
  },
});

export const updateCase = createTool({
  description: `
Update metadata or status for the current Case.

Use this to reflect meaningful changes such as resolving a Case,
waiting for the user, or correcting its category or summary.

Do not change the Case title casually.
`.trim(),

  inputSchema: z.object({
    caseId: z.string(),

    summary: z
      .string()
      .max(1000)
      .optional(),

    category: z
      .string()
      .max(100)
      .optional(),

    status: z
      .enum([
        "active",
        "waiting_user",
        "resolved",
        "archived",
      ])
      .optional(),
  }),

  execute: async (ctx, input): Promise<unknown> => {
    return await ctx.runMutation(
      internal.cases.update.updateForAgent,
      {
        userId: ctx.userId,
        threadId: ctx.threadId,
        caseId: input.caseId as Id<"cases">,
        summary: input.summary,
        category: input.category,
        status: input.status,
      },
    );
  },
});

export const recordCaseActivity = createTool({
  description: `
Record a meaningful action, finding, communication, response, or other
development in the current Case.

Use this after meaningful work so the Case history accurately reflects
what Witness has done.
`.trim(),

  inputSchema: z.object({
    caseId: z.string(),

    type: z.enum([
      "agent_action",
      "research",
      "email",
      "user_action",
      "external_response",
    ]),

    title: z
      .string()
      .min(1)
      .max(200),

    description: z
      .string()
      .max(2000)
      .optional(),

    metadata: z
      .record(z.string(), z.unknown())
      .optional(),

    summarize: z
      .boolean()
      .optional(),
  }),

  execute: async (ctx, input): Promise<unknown> => {
    return await ctx.runMutation(
      internal.cases.activities.recordForAgent,
      {
        userId: ctx.userId,
        threadId: ctx.threadId,
        caseId: input.caseId as Id<"cases">,
        type: input.type,
        title: input.title,
        description: input.description,
        metadata: input.metadata,
        summarize: input.summarize ?? false,
      },
    );
  },
});

export const addCaseWidget = createTool({
  description: `
Add a structured widget to the current Case document.

Use this for useful artifacts such as research findings, links, emails,
approvals, questions, results, or other structured information that should
appear in the Case document.
`.trim(),

  inputSchema: z.object({
    caseId: z.string(),

    type: z.enum([
      "email",
      "research",
      "document",
      "action",
      "approval",
      "question",
      "link",
      "result",
    ]),

    data: z.record(
      z.string(),
      z.unknown(),
    ),
  }),

  execute: async (ctx, input): Promise<unknown> => {
    return await ctx.runMutation(
      internal.cases.widgets.createForAgent,
      {
        userId: ctx.userId,
        threadId: ctx.threadId,
        caseId: input.caseId as Id<"cases">,
        type: input.type,
        data: input.data,
      },
    );
  },
});