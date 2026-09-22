"use node";

import { Composio } from "@composio/core";
import { internalAction } from "../../_generated/server";
import { v } from "convex/values";

function getComposio() {
  const apiKey = process.env.COMPOSIO_API_KEY;

  if (!apiKey) {
    throw new Error("COMPOSIO_API_KEY is not configured.");
  }

  return new Composio({ apiKey });
}

export const searchEmails = internalAction({
  args: {
    userId: v.string(),
    query: v.string(),
    maxResults: v.optional(v.number()),
  },

  handler: async (_, args) => {
    const composio = getComposio();

    const session = await composio.sessions.create(args.userId, {
      toolkits: ["gmail"],
      sandbox: { enable: false },
    });

    return await session.execute("GMAIL_FETCH_EMAILS", {
      query: args.query,
      max_results: args.maxResults ?? 10,
    });
  },
});

export const getEmail = internalAction({
  args: {
    userId: v.string(),
    messageId: v.string(),
  },

  handler: async (_, args) => {
    const composio = getComposio();

    const session = await composio.sessions.create(args.userId, {
      toolkits: ["gmail"],
      sandbox: { enable: false },
    });

    return await session.execute("GMAIL_FETCH_MESSAGE_BY_MESSAGE_ID", {
      message_id: args.messageId,
      format: "full",
    });
  },
});