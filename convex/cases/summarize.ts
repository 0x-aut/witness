import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";

import { witnessAgent } from "../agents/witness";


import { internal } from "../_generated/api";
import { v } from "convex/values";
import { generateObject } from "ai";
import { z } from "zod";

import { getQwenModel } from "../providers/qwen";

const narrativeSchema = z.object({
  createBlock: z.boolean(),
  summary: z.string(),
});

type NarrativeResult = z.infer<typeof narrativeSchema>;

const SUMMARIZER_INSTRUCTIONS = `
You are the Case narrative writer for Witness.

Witness is an assistant that helps users resolve real-world problems.

Your job is NOT to reproduce the agent conversation.
Your job is to turn verified Case activity into concise, natural prose
that belongs in a living Case document.

Rules:

- Only use facts explicitly present in the provided Case and activities.
- Never invent actions, results, communications, policies, dates, or outcomes.
- Do not describe internal implementation details.
- Do not mention tools unless the tool action itself is useful to the user.
- Refer to the assistant as "Witness".
- Write like a person documenting progress in a polished article.
- Do not use headings.
- Do not use Markdown.
- Do not use bullets.
- Usually write one or two sentences.
- Create a block only when the new activities represent meaningful progress,
  a useful finding, a user decision, an external response, or another
  meaningful development.
- Ignore trivial/internal events.
- Avoid repeating information already present in the existing narrative.
`.trim();

export const getContext = internalQuery({
  args: {
    caseId: v.id("cases"),
    activityIds: v.array(v.id("caseActivities")),
  },

  handler: async (ctx, args) => {
    const caseData = await ctx.db.get(args.caseId);

    if (!caseData) {
      throw new Error("Case not found.");
    }

    const requestedActivities = await Promise.all(
      args.activityIds.map(id => ctx.db.get(id)),
    );

    const activities = requestedActivities.filter(
      (
        activity,
      ): activity is NonNullable<typeof activity> =>
        activity !== null &&
        activity.caseId === args.caseId,
    );

    const blocks = await ctx.db
      .query("caseBlocks")
      .withIndex(
        "by_case_id",
        q => q.eq("caseId", args.caseId),
      )
      .collect();

    const narrativeBlocks = blocks
      .filter(
        block =>
          block.type === "narrative" &&
          typeof block.text === "string",
      )
      .sort((a, b) => a.order - b.order);

    return {
      caseData,
      activities,
      narrativeBlocks,
    };
  },
});

export const summarizeActivityBatch = internalAction({
  args: {
    caseId: v.id("cases"),
    activityIds: v.array(v.id("caseActivities")),
  },

  handler: async (ctx, args) => {
    if (!args.activityIds.length) {
      return;
    }

    const context = await ctx.runQuery(
      internal.cases.summarize.getContext,
      {
        caseId: args.caseId,
        activityIds: args.activityIds,
      },
    );

    if (!context.activities.length) {
      return;
    }

    const existingNarrative = context.narrativeBlocks
      .slice(-8)
      .map(block => block.text)
      .filter(Boolean)
      .join("\n\n");

    const activityContext = context.activities
      .map(activity => {
        const metadata =
          activity.metadata !== undefined
            ? `\nMetadata: ${JSON.stringify(activity.metadata)}`
            : "";

        return [
          `Type: ${activity.type}`,
          `Title: ${activity.title}`,
          `Description: ${activity.description ?? ""}`,
          metadata,
        ].join("\n");
      })
      .join("\n\n");

    const prompt = `
CASE

Title:
${context.caseData.title}

Original request:
${context.caseData.originalPrompt}

Existing Case narrative:
${existingNarrative || "(No narrative yet)"}

New Case activities:
${activityContext}

Write the next useful narrative block for the Case.

Only summarize the new meaningful development.
Do not restate the entire Case.
`.trim();

    const { object } = await generateObject({
      model: getQwenModel(),
      schema: narrativeSchema,
      system: SUMMARIZER_INSTRUCTIONS,
      prompt,
    });

    const result: NarrativeResult = object;

    if (!result.createBlock || !result.summary.trim()) {
      return;
    }

    await ctx.runMutation(
      internal.cases.summarize.persistNarrative,
      {
        caseId: args.caseId,
        activityIds: args.activityIds,
        text: result.summary.trim(),
      },
    );
  },
});

export const persistNarrative = internalMutation({
  args: {
    caseId: v.id("cases"),
    activityIds: v.array(v.id("caseActivities")),
    text: v.string(),
  },

  handler: async (ctx, args) => {
    const caseData = await ctx.db.get(args.caseId);

    if (!caseData) {
      throw new Error("Case not found.");
    }

    const blocks = await ctx.db
      .query("caseBlocks")
      .withIndex(
        "by_case_id",
        q => q.eq("caseId", args.caseId),
      )
      .collect();

    const summarizedActivityIds = new Set<string>();

    for (const block of blocks) {
      for (const activityId of block.sourceActivityIds ?? []) {
        summarizedActivityIds.add(activityId);
      }
    }

    const unsummarizedActivityIds =
      args.activityIds.filter(
        activityId =>
          !summarizedActivityIds.has(activityId),
      );

    if (!unsummarizedActivityIds.length) {
      return null;
    }

    const latestBlock = blocks.reduce<
      (typeof blocks)[number] | null
    >(
      (latest, block) =>
        !latest || block.order > latest.order
          ? block
          : latest,
      null,
    );

    if (
      latestBlock?.type === "narrative" &&
      latestBlock.text?.trim() === args.text.trim()
    ) {
      return latestBlock._id;
    }

    const now = Date.now();

    const order = latestBlock
      ? latestBlock.order + 1000
      : 1000;

    const blockId = await ctx.db.insert(
      "caseBlocks",
      {
        userId: caseData.userId,
        caseId: args.caseId,
        type: "narrative",
        order,
        text: args.text.trim(),
        sourceActivityIds: unsummarizedActivityIds,
        createdAt: now,
        updatedAt: now,
      },
    );

    await ctx.db.patch(args.caseId, {
      updatedAt: now,
    });

    return blockId;
  },
});

/**
 * Generates the first narrative block for a Case.
 *
 * The first block is special because it is based on the user's original
 * request rather than Agent activity.
 */
export const summarizeInitial = internalAction({
  args: {
    caseId: v.id("cases"),
    activityId: v.id("caseActivities"),
    threadId: v.string(),
    prompt: v.string(),
    displayUsername: v.string(),
  },

  handler: async (ctx, args) => {
    const { object } = await generateObject({
      model: getQwenModel(),
      schema: z.object({
        title: z.string(),
        summary: z.string(),
        narrative: z.string(),
      }),
      system: `
        You are generating the initial identity and opening narrative for a Witness Case.
        
        Return valid JSON matching the provided schema.
        
        TITLE:
        Create a very short, clear Case title.
        It should normally be 2–6 words.
        Use normal title-style capitalization.
        Do not write a sentence.
        Do not include unnecessary details.
        
        Examples:
        "Cancel Netflix Subscription"
        "Appeal Insurance Claim"
        "Dispute Internet Bill"
        "Resolve Landlord Repair Issue"
        "Request Airline Refund"
        
        SUMMARY:
        Write one concise sentence explaining what the user wants help with.
        Use the user's display username naturally when appropriate.
        Do not mention Witness unless it helps.
        
        NARRATIVE:
        Write one concise sentence suitable for the opening of the Case document.
        It should describe the user's situation naturally.
        
        Rules:
        - Never invent facts.
        - Preserve the user's actual intent.
        - Keep everything concise.
        - No Markdown.
        - No headings.
`.trim(),
      prompt: `
User display username:
${args.displayUsername}

Original request:
${args.prompt}
`.trim(),
    });

    const summary = object.summary.trim();

    if (!summary) {
      return;
    }

    const { thread } = await witnessAgent.continueThread(
      ctx,
      {
        threadId: args.threadId,
      },
    );
    
    await thread.updateMetadata({
      title: object.title.trim(),
      summary: object.summary.trim(),
    });

    await ctx.runMutation(
      internal.cases.summarize.persistInitial,
      {
        caseId: args.caseId,
        activityId: args.activityId,
        title: object.title,
        summary: object.summary,
        narrative: object.narrative,
      },
    );
  },
});

export const persistInitial = internalMutation({
  args: {
    caseId: v.id("cases"),
    activityId: v.id("caseActivities"),
    title: v.string(),
    summary: v.string(),
    narrative: v.string(),
  },

  handler: async (ctx, args) => {
    const caseData = await ctx.db.get(args.caseId);

    if (!caseData) {
      throw new Error("Case not found.");
    }

    const title = args.title.trim();
    const summary = args.summary.trim();
    const narrative = args.narrative.trim();

    if (!title || !summary || !narrative) {
      throw new Error(
        "Initial Case summary must contain a title, summary, and narrative.",
      );
    }

    const now = Date.now();

    /*
     * Update the Case metadata.
     */
    await ctx.db.patch(args.caseId, {
      title,
      summary,
      updatedAt: now,
    });

    const blocks = await ctx.db
      .query("caseBlocks")
      .withIndex(
        "by_case_id",
        q => q.eq("caseId", args.caseId),
      )
      .order("asc")
      .collect();

    const existingInitialBlock = blocks.find(
      block =>
        block.type === "narrative" &&
        (block.sourceActivityIds ?? []).some(
          id => id === args.activityId,
        ),
    );

    /*
     * If the initial summarizer somehow runs twice,
     * update the existing initial block instead of creating another one.
     */
    if (existingInitialBlock) {
      await ctx.db.patch(existingInitialBlock._id, {
        text: narrative,
        updatedAt: now,
      });

      return existingInitialBlock._id;
    }

    const firstBlock = blocks[0];

    const order = firstBlock
      ? Math.max(1, firstBlock.order - 1000)
      : 1000;

    return await ctx.db.insert("caseBlocks", {
      userId: caseData.userId,
      caseId: args.caseId,
      type: "narrative",
      order,
      text: narrative,
      sourceActivityIds: [args.activityId],
      createdAt: now,
      updatedAt: now,
    });
  },
});


export const summarizeAgentResponse = internalAction({
  args: {
    caseId: v.id("cases"),
    agentId: v.id("agents"),
    threadId: v.string(),
    promptMessageId: v.string(),
    responseText: v.string(),
  },

  handler: async (ctx, args) => {
    const context = await ctx.runQuery(
      internal.cases.summarize.getAgentSummaryContext,
      {
        caseId: args.caseId,
      },
    );

    if (!context) {
      return;
    }

    const existingNarrative = context.narrativeBlocks
      .slice(-8)
      .map(block => block.text)
      .filter(Boolean)
      .join("\n\n");

    const recentActivities = context.activities
      .slice(-12)
      .map(activity => {
        const metadata =
          activity.metadata !== undefined
            ? `\nMetadata: ${JSON.stringify(activity.metadata)}`
            : "";

        return [
          `Type: ${activity.type}`,
          `Title: ${activity.title}`,
          `Description: ${activity.description ?? ""}`,
          metadata,
        ].join("\n");
      })
      .join("\n\n");

    const prompt = `
CASE TITLE:
${context.caseData.title}

ORIGINAL USER REQUEST:
${context.caseData.originalPrompt}

EXISTING CASE NARRATIVE:
${existingNarrative || "(none yet)"}

AGENT RESPONSE:
${args.responseText}

RECENT CASE ACTIVITIES:
${recentActivities || "(none yet)"}

Write the next meaningful Case narrative block.

The block should explain what Witness accomplished,
discovered, determined, or communicated during this turn.

Do not simply repeat the Agent response.

Do not invent actions or results.

Do not mention internal tools or implementation details unless
they are directly useful to understanding what Witness did.

Do not use Markdown.

Keep the result concise, natural, and suitable for a polished
Case document.

Return no heading.
`.trim();

    const { object } = await generateObject({
      model: getQwenModel(),
      schema: z.object({
        createBlock: z.boolean(),
        summary: z.string(),
      }),
      system: `
      You are the narrative writer for a Witness Case.
      
      Return a valid JSON object matching the provided schema.
      
      The Case is a living document describing work Witness has performed
      on behalf of the user.
      
      Your job is to turn completed Agent work into concise, factual prose.
      
      Only state things supported by the Agent response, Case activities,
      or other supplied Case data.
      
      Never invent actions, findings, communications, or outcomes.
      
      Do not write Markdown inside the summary.
      Do not use headings.
      Do not repeat existing narrative unless necessary for continuity.
      
      Only create a block when this turn represents meaningful progress.
`.trim(),
      prompt,
    });

    if (!object.createBlock || !object.summary.trim()) {
      return;
    }

    await ctx.runMutation(
      internal.cases.summarize.persistAgentNarrative,
      {
        caseId: args.caseId,
        agentId: args.agentId,
        activityIds: context.activities.map(
          activity => activity._id,
        ),
        text: object.summary.trim(),
      },
    );
  },
});

export const getAgentSummaryContext = internalQuery({
  args: {
    caseId: v.id("cases"),
  },

  handler: async (ctx, args) => {
    const caseData = await ctx.db.get(args.caseId);

    if (!caseData) {
      return null;
    }

    const activities = await ctx.db
      .query("caseActivities")
      .withIndex(
        "by_case_id",
        q => q.eq("caseId", args.caseId),
      )
      .order("desc")
      .take(20);

    const narrativeBlocks = await ctx.db
      .query("caseBlocks")
      .withIndex(
        "by_case_id_order",
        q => q.eq("caseId", args.caseId),
      )
      .order("asc")
      .collect();

    return {
      caseData,
      activities,
      narrativeBlocks,
    };
  },
});

export const persistAgentNarrative = internalMutation({
  args: {
    caseId: v.id("cases"),
    agentId: v.id("agents"),
    activityIds: v.array(
      v.id("caseActivities"),
    ),
    text: v.string(),
  },

  handler: async (ctx, args) => {
    const caseData = await ctx.db.get(args.caseId);

    if (!caseData) {
      throw new Error("Case not found.");
    }

    const blocks = await ctx.db
      .query("caseBlocks")
      .withIndex(
        "by_case_id_order",
        q => q.eq("caseId", args.caseId),
      )
      .order("desc")
      .collect();

    const latestBlock = blocks[0];

    /*
     * Prevent the same summary from being inserted twice.
     */
    if (
      latestBlock?.type === "narrative" &&
      latestBlock.text?.trim() === args.text.trim()
    ) {
      return latestBlock._id;
    }

    const now = Date.now();

    return await ctx.db.insert(
      "caseBlocks",
      {
        userId: caseData.userId,
        caseId: args.caseId,
        type: "narrative",
        order: latestBlock
          ? latestBlock.order + 1000
          : 1000,
        text: args.text.trim(),
        sourceActivityIds: args.activityIds,
        createdAt: now,
        updatedAt: now,
      },
    );
  },
});