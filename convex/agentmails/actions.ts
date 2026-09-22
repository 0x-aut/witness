"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { authComponent } from "../betterAuth/auth";

export const ensureInbox = action({
  args: {
    username: v.string(),
  },

  handler: async (ctx, args) => {
    const userInbox = await ctx.runQuery(
      internal.agentmail.getUserInbox,
      {},
    );

    if (userInbox) {
      return userInbox;
    }
    
    const user = await authComponent.getAuthUser(ctx);
    
    if (!user) {
      throw new Error("Unauthorized.");
    }
    
    const userId = user._id;

    const apiKey = process.env.AGENTMAIL_API_KEY;

    if (!apiKey) {
      throw new Error("AGENTMAIL_API_KEY is not configured.");
    }

    const username = args.username
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (!username) {
      throw new Error("Invalid username for AgentMail inbox.");
    }

    console.log("Sending data to create inbox")

    const response = await fetch(
      "https://api.agentmail.to/v0/inboxes",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: `${username}-witness-agent`,
          domain: "agentmail.to",
          display_name: `Witness Agent`,
          client_id: `witness-agent-${userId}`,
        }),
      },
    );


    if (!response.ok) {
      const body = await response.text();

      throw new Error(
        `AgentMail inbox creation failed (${response.status}): ${body}`,
      );
    }

    const inbox = await response.json() as {
      inbox_id: string;
      email: string;
    };

    await ctx.runMutation(
      internal.agentmail.saveUserInbox,
      {
        inboxId: inbox.inbox_id,
        email: inbox.email,
      },
    );

    return {
      inboxId: inbox.inbox_id,
      email: inbox.email,
    };
  },
});



export const replyToEmail = action({
  args: {
    inboxItemId: v.id("inboxItems"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized.");

    const text = args.text.trim();
    if (!text) throw new Error("Reply cannot be empty.");

    const item = await ctx.runQuery(internal.inboxQueries.getForUser, {
      id: args.inboxItemId,
      userId: user._id,
    });

    if (
      !item ||
      item.types !== "email" ||
      item.source !== "agentmail" ||
      !item.externalId
    ) {
      throw new Error("Email cannot be replied to.");
    }

    const inbox = await ctx.runQuery(
      internal.agentmail.getUserInbox,
      {},
    );

    if (!inbox) throw new Error("AgentMail inbox not found.");

    const apiKey = process.env.AGENTMAIL_API_KEY;
    if (!apiKey) throw new Error("AGENTMAIL_API_KEY is not configured.");

    const response = await fetch(
      `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(inbox.inboxId)}/messages/${encodeURIComponent(item.externalId)}/reply`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`AgentMail reply failed (${response.status}): ${body}`);
    }

    const result = (await response.json()) as {
      message_id: string;
      thread_id: string;
    };

    await ctx.runMutation(internal.agentmail.markReplySent, {
      inboxItemId: args.inboxItemId,
      userId: user._id,
      text,
      outboundId: result.message_id,
      threadId: result.thread_id,
    });

    return result;
  },
});