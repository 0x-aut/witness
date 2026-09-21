import {
  internalAction,
  internalMutation,
} from "../_generated/server";

import { witnessAgent } from "../agents/witness";


import { internal } from "../_generated/api";
import { v } from "convex/values";
import { generateObject } from "ai";
import { z } from "zod";

import { getQwenModel } from "../providers/qwen";

/**
 * Generates the title for an Agent/chat.
 *
 */
export const summarizeInitial = internalAction({
  args: {
    agentId: v.id("agents"),
    threadId: v.string(),
    prompt: v.string(),
    displayUsername: v.string(),
  },

  handler: async (ctx, args) => {
    const { object } = await generateObject({
      model: getQwenModel(),
      schema: z.object({
        title: z.string(),
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
        Never add ellipses to the title for any reason (...) Never.
        
        Examples:
        "Trying to Cancel Netflix Subscription"
        "Appealing an Insurance Claim"
        "Dispute Internet Bill"
        "Resolve Landlord Repair Issue"
        "Request Airline Refund"
        
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

    const { thread } = await witnessAgent.continueThread(
      ctx,
      {
        threadId: args.threadId,
      },
    );

    let currentTitle = (await thread.getMetadata()).title as string;

    
    if (currentTitle.includes("...")) {
      await thread.updateMetadata({
        title: object.title.trim(),
      }); 
    }

    await ctx.runMutation(
      internal.agents.summarize.persistInitial,
      {
        agentId: args.agentId,
        title: object.title,
      },
    );
  },
});

export const persistInitial = internalMutation({
  args: {
    agentId: v.id("agents"),
    title: v.string(),
  },

  handler: async (ctx, args) => {
    const agentData = await ctx.db.get(args.agentId);

    if (!agentData) {
      throw new Error("Agent not found.");
    }

    const title = args.title.trim();

    if (!title) {
      throw new Error(
        "Agent must contain a title",
      );
    }

    const now = Date.now();

    /*
     * Update the Agent metadata.
     */
    await ctx.db.patch(args.agentId, {
      title,
      updatedAt: now,
    });
  },
});