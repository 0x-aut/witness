import { createTool } from "@convex-dev/agent";
import { FirecrawlClient } from "@firecrawl/firecrawl-convex";
import { z } from "zod/v4";
import { v } from "convex/values";

import {
  internal,
  components,
} from "../../_generated/api";

import {
  internalMutation,
  internalQuery,
} from "../../_generated/server";

import type { Id } from "../../_generated/dataModel";

const firecrawl = new FirecrawlClient(
  components.firecrawl,
);

/* -------------------------------------------------------------------------- */
/* Internal functions                                                         */
/* -------------------------------------------------------------------------- */

export const requestUserAction = internalMutation({
  args: {
    userId: v.string(),
    caseId: v.id("cases"),
    agentId: v.id("agents"),
    type: v.union(
      v.literal("upload_file"),
      v.literal("question"),
      v.literal("approval"),
    ),
    prompt: v.string(),
    metadata: v.optional(v.any()),
  },

  handler: async (
    ctx,
    args,
  ): Promise<{
    actionId: Id<"userActions">;
    inboxItemId: Id<"inboxItems">;
  }> => {
    const caseData = await ctx.db.get(args.caseId);
    const agent = await ctx.db.get(args.agentId);

    if (
      !caseData ||
      caseData.userId !== args.userId ||
      !agent ||
      agent.userId !== args.userId ||
      agent.caseId !== args.caseId
    ) {
      throw new Error("Invalid Case or Agent.");
    }

    const now = Date.now();

    const actionId = await ctx.db.insert(
      "userActions",
      {
        userId: args.userId,
        caseId: args.caseId,
        agentId: args.agentId,
        type: args.type,
        prompt: args.prompt.trim(),
        status: "pending",
        metadata: args.metadata,
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
        caseId: args.caseId,
        agentId: args.agentId,
        types: "notification",
        title,
        preview: args.prompt.trim(),
        content: args.prompt.trim(),
        read: false,
        starred: false,
        source: "witness",
        externalId: String(actionId),
        updatedAt: now,
      },
    );

    /*
     * Preserve the interruption inside the Case document too.
     */
    const latestBlock = await ctx.db
      .query("caseBlocks")
      .withIndex(
        "by_case_id_order",
        q => q.eq(
          "caseId",
          args.caseId,
        ),
      )
      .order("desc")
      .first();

    const order = latestBlock
      ? latestBlock.order + 1000
      : 1000;

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
        caseId: args.caseId,
        type: widgetType,
        data: {
          actionId,
          actionType: args.type,
          prompt: args.prompt.trim(),
          status: "pending",
          metadata: args.metadata,
        },
        createdAt: now,
        updatedAt: now,
      },
    );

    await ctx.db.insert(
      "caseBlocks",
      {
        userId: args.userId,
        caseId: args.caseId,
        type: "widget",
        order,
        widgetId,
        createdAt: now,
        updatedAt: now,
      },
    );

    await ctx.db.patch(
      args.agentId,
      {
        status: "needs_user_action",
        updatedAt: now,
      },
    );

    await ctx.db.patch(
      args.caseId,
      {
        status: "waiting_user",
        updatedAt: now,
      },
    );

    await ctx.db.insert(
      "caseActivities",
      {
        userId: args.userId,
        caseId: args.caseId,
        agentId: args.agentId,
        type: "user_action",
        title,
        description: args.prompt.trim(),
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
    };
  },
});

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
      throw new Error("Case not found.");
    }

    const files = await ctx.db
      .query("files")
      .withIndex(
        "by_case_id",
        q => q.eq(
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
    }));
  },
});

/* -------------------------------------------------------------------------- */
/* Web research tools                                                        */
/* -------------------------------------------------------------------------- */

export const searchWeb = createTool({
  description:
    "Search the current public internet for information relevant to the user's problem. Prefer official government, company, policy, regulatory, or other authoritative sources.",

  inputSchema: z.object({
    query: z
      .string()
      .min(2)
      .describe(
        "A precise web search query.",
      ),
  }),

  execute: async (
    ctx,
    input,
  ): Promise<unknown> => {
    const result = await firecrawl.search(
      ctx,
      input.query,
      {
        limit: 5,
        scrapeOptions: {
          formats: ["markdown"],
          onlyMainContent: true,
        },
      },
    );

    if (
      ctx.userId &&
      ctx.threadId
    ) {
      await ctx.runMutation(
        internal.agents.tools.cases.recordResearchActivity,
        {
          userId: ctx.userId,
          threadId: ctx.threadId,
          title: "Web research",
          description:
            `Witness searched the web for "${input.query}".`,
          metadata: {
            query: input.query,
          },
        },
      );
    }

    return result;
  },
});

export const scrapeUrl = createTool({
  description:
    "Read a specific public webpage and extract its useful content. Use this when a search result or known URL needs to be inspected in detail.",

  inputSchema: z.object({
    url: z
      .string()
      .url()
      .describe(
        "The public webpage URL to inspect.",
      ),
  }),

  execute: async (
    ctx,
    input,
  ): Promise<unknown> => {
    const result = await firecrawl.scrape(
      ctx,
      input.url,
      {
        formats: ["markdown"],
        onlyMainContent: true,
      },
    );

    if (
      ctx.userId &&
      ctx.threadId
    ) {
      await ctx.runMutation(
        internal.agents.tools.cases.recordResearchActivity,
        {
          userId: ctx.userId,
          threadId: ctx.threadId,
          title: "Reviewed a webpage",
          description:
            `Witness reviewed ${input.url}.`,
          metadata: {
            url: input.url,
          },
        },
      );
    }

    return result;
  },
});

export const mapSite = createTool({
  description:
    "Discover the URLs available on a public website. Use this when the relevant information may be buried elsewhere on an organization's site.",

  inputSchema: z.object({
    url: z
      .string()
      .url()
      .describe(
        "The public website URL to map.",
      ),

    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe(
        "Maximum number of URLs to return.",
      ),
  }),

  execute: async (
    ctx,
    input,
  ): Promise<unknown> => {
    const result = await firecrawl.map(
      ctx,
      input.url,
      {
        limit: input.limit ?? 50,
      },
    );

    if (
      ctx.userId &&
      ctx.threadId
    ) {
      await ctx.runMutation(
        internal.agents.tools.cases.recordResearchActivity,
        {
          userId: ctx.userId,
          threadId: ctx.threadId,
          title: "Mapped a website",
          description:
            `Witness mapped ${input.url} to find relevant pages.`,
          metadata: {
            url: input.url,
          },
        },
      );
    }

    return result;
  },
});

/* -------------------------------------------------------------------------- */
/* User interaction                                                           */
/* -------------------------------------------------------------------------- */

export const askUser = createTool({
  description:
    "Pause meaningful Case work and ask the user for information needed to continue. Use this when the Agent genuinely cannot proceed without the user's answer, a document, or approval.",

  inputSchema: z.object({
    type: z
      .enum([
        "question",
        "approval",
        "upload_file",
      ])
      .describe(
        "The kind of user action required.",
      ),

    prompt: z
      .string()
      .min(2)
      .describe(
        "A concise explanation of exactly what the user needs to provide or approve.",
      ),

    metadata: z
      .record(
        z.string(),
        z.unknown(),
      )
      .optional()
      .describe(
        "Optional structured information needed by the UI or action handler.",
      ),
  }),

  execute: async (
    ctx,
    input,
  ): Promise<unknown> => {
    if (
      !ctx.userId ||
      !ctx.threadId
    ) {
      throw new Error(
        "Missing Agent context.",
      );
    }

    const thread =
      await ctx.runQuery(
        internal.agents.tools.cases.getThreadContext,
        {
          userId: ctx.userId,
          threadId: ctx.threadId,
        },
      );

    if (!thread.caseId) {
      throw new Error(
        "The Agent must be attached to a Case before requesting user action.",
      );
    }

    return await ctx.runMutation(
      internal.agents.tools.work.requestUserAction,
      {
        userId: ctx.userId,
        caseId: thread.caseId,
        agentId: thread.agentId,
        type: input.type,
        prompt: input.prompt,
        metadata: input.metadata,
      },
    );
  },
});

/* -------------------------------------------------------------------------- */
/* Case documents                                                             */
/* -------------------------------------------------------------------------- */

export const getCaseFiles = createTool({
  description:
    "List the documents already attached to a Case so you can determine what evidence or files are available before asking the user for another document.",

  inputSchema: z.object({
    caseId: z
      .string()
      .describe(
        "The Case ID.",
      ),
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