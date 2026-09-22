"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { authComponent } from "../betterAuth/auth";
import type { ActionCtx } from "../_generated/server";

type AgentInbox = {
  inboxId: string;
  email: string;
};

type AgentMailMessage = {
  inbox_id?: string;
  thread_id?: string;
  message_id: string;
  labels?: string[];
  timestamp?: string;
  updated_at?: string;
  created_at?: string;
  from?: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  preview?: string;
  text?: string;
  html?: string;
  extracted_text?: string;
  extracted_html?: string;
  in_reply_to?: string;
  references?: string[];
  headers?: Record<string, string>;
  attachments?: Array<{
    attachment_id: string;
    size?: number;
    filename?: string;
    content_type?: string;
    content_disposition?: string;
    content_id?: string;
  }>;
};

type MessageListResponse = {
  count: number;
  messages: AgentMailMessage[];
  limit?: number;
  next_page_token?: string;
};

type MessageSearchResponse = {
  count: number;
  messages: Array<
    AgentMailMessage & {
      highlights?: Record<string, string[]>;
    }
  >;
  limit?: number;
  next_page_token?: string;
};

type SendResponse = {
  message_id: string;
  thread_id: string;
};

function getApiKey(): string {
  const apiKey = process.env.AGENTMAIL_API_KEY;

  if (!apiKey) {
    throw new Error("AGENTMAIL_API_KEY is not configured.");
  }

  return apiKey;
}

function extractEmailAddress(value?: string): string {
  if (!value) {
    return "";
  }

  const match = value.match(/<([^>]+)>/);

  return (match?.[1] ?? value).trim().toLowerCase();
}

function normalizeMessage(message: AgentMailMessage) {
  return {
    messageId: message.message_id,
    threadId: message.thread_id,
    inboxId: message.inbox_id,
    timestamp: message.timestamp,
    createdAt: message.created_at,
    updatedAt: message.updated_at,
    from: message.from,
    to: message.to ?? [],
    cc: message.cc ?? [],
    bcc: message.bcc ?? [],
    subject: message.subject,
    preview: message.preview,
    text: message.extracted_text ?? message.text,
    html: message.extracted_html ?? message.html,
    inReplyTo: message.in_reply_to,
    references: message.references ?? [],
    labels: message.labels ?? [],
    attachments: message.attachments ?? [],
  };
}

async function requestAgentMail<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(
    `https://api.agentmail.to/v0${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    },
  );

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `AgentMail request failed (${response.status}): ${body}`,
    );
  }

  return (await response.json()) as T;
}

async function requireInbox(
  ctx: ActionCtx,
  userId: string,
): Promise<AgentInbox> {
  const inbox = await ctx.runQuery(
    internal.agentmail.getUserInboxByUserId,
    {
      userId,
    },
  );

  if (!inbox) {
    throw new Error("AgentMail inbox not found.");
  }

  return {
    inboxId: inbox.inboxId,
    email: inbox.email,
  };
}

/* -------------------------------------------------------------------------- */
/* Inbox provisioning                                                         */
/* -------------------------------------------------------------------------- */

export const ensureInbox = action({
  args: {
    username: v.string(),
  },

  handler: async (
    ctx,
    args,
  ): Promise<AgentInbox> => {
    const existing = await ctx.runQuery(
      internal.agentmail.getUserInbox,
      {},
    );

    if (existing) {
      return {
        inboxId: existing.inboxId,
        email: existing.email,
      };
    }

    const user =
      await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("Unauthorized.");
    }

    const username = args.username
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (!username) {
      throw new Error(
        "Invalid username for AgentMail inbox.",
      );
    }

    const response = await fetch(
      "https://api.agentmail.to/v0/inboxes",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getApiKey()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: `${username}-witness-agent`,
          domain: "agentmail.to",
          display_name: "Witness Agent",
          client_id: `witness-agent-${user._id}`,
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();

      throw new Error(
        `AgentMail inbox creation failed (${response.status}): ${body}`,
      );
    }

    const inbox = (await response.json()) as {
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

/* -------------------------------------------------------------------------- */
/* Agent identity                                                             */
/* -------------------------------------------------------------------------- */

export const getAgentIdentity = action({
  args: {
    userId: v.string(),
  },

  handler: async (
    ctx,
    args,
  ): Promise<{
    name: string;
    email: string;
    inboxId: string;
  }> => {
    const inbox = await requireInbox(
      ctx,
      args.userId,
    );

    return {
      name: "Witness Agent",
      email: inbox.email,
      inboxId: inbox.inboxId,
    };
  },
});

/* -------------------------------------------------------------------------- */
/* List incoming emails                                                       */
/* -------------------------------------------------------------------------- */

export const listEmails = action({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
    pageToken: v.optional(v.string()),
    from: v.optional(v.string()),
    to: v.optional(v.string()),
    subject: v.optional(v.string()),
  },

  handler: async (
    ctx,
    args,
  ): Promise<{
    count: number;
    messages: ReturnType<typeof normalizeMessage>[];
    nextPageToken?: string;
  }> => {
    const inbox = await requireInbox(
      ctx,
      args.userId,
    );

    const limit = Math.min(
      Math.max(
        Math.floor(args.limit ?? 20),
        1,
      ),
      100,
    );

    const params = new URLSearchParams();

    params.set(
      "limit",
      String(limit),
    );

    if (args.pageToken) {
      params.set(
        "page_token",
        args.pageToken,
      );
    }

    if (args.from?.trim()) {
      params.append(
        "from",
        args.from.trim(),
      );
    }

    if (args.to?.trim()) {
      params.append(
        "to",
        args.to.trim(),
      );
    }

    if (args.subject?.trim()) {
      params.append(
        "subject",
        args.subject.trim(),
      );
    }

    const result =
      await requestAgentMail<MessageListResponse>(
        `/inboxes/${encodeURIComponent(inbox.inboxId)}/messages?${params.toString()}`,
      );

    const ownAddress =
      inbox.email.trim().toLowerCase();

    const messages = result.messages
      .filter(
        message =>
          extractEmailAddress(message.from) !==
          ownAddress,
      )
      .map(normalizeMessage);

    return {
      count: messages.length,
      messages,
      nextPageToken:
        result.next_page_token,
    };
  },
});

/* -------------------------------------------------------------------------- */
/* Search incoming emails                                                     */
/* -------------------------------------------------------------------------- */

export const searchEmails = action({
  args: {
    userId: v.string(),
    query: v.string(),
    limit: v.optional(v.number()),
    pageToken: v.optional(v.string()),
    before: v.optional(v.string()),
    after: v.optional(v.string()),
  },

  handler: async (
    ctx,
    args,
  ): Promise<{
    count: number;
    query: string;
    messages: Array<
      ReturnType<typeof normalizeMessage> & {
        highlights: Record<string, string[]>;
      }
    >;
    nextPageToken?: string;
  }> => {
    const inbox = await requireInbox(
      ctx,
      args.userId,
    );

    const query = args.query.trim();

    if (!query) {
      throw new Error(
        "Email search query cannot be empty.",
      );
    }

    const limit = Math.min(
      Math.max(
        Math.floor(args.limit ?? 10),
        1,
      ),
      100,
    );

    const params = new URLSearchParams();

    params.set("q", query);
    params.set(
      "limit",
      String(limit),
    );

    if (args.pageToken) {
      params.set(
        "page_token",
        args.pageToken,
      );
    }

    if (args.before) {
      params.set(
        "before",
        args.before,
      );
    }

    if (args.after) {
      params.set(
        "after",
        args.after,
      );
    }

    const result =
      await requestAgentMail<MessageSearchResponse>(
        `/inboxes/${encodeURIComponent(inbox.inboxId)}/messages/search?${params.toString()}`,
      );

    const ownAddress =
      inbox.email.trim().toLowerCase();

    const messages = result.messages
      .filter(
        message =>
          extractEmailAddress(message.from) !==
          ownAddress,
      )
      .map(message => ({
        ...normalizeMessage(message),
        highlights:
          message.highlights ?? {},
      }));

    return {
      count: messages.length,
      query,
      messages,
      nextPageToken:
        result.next_page_token,
    };
  },
});

/* -------------------------------------------------------------------------- */
/* Get one email                                                              */
/* -------------------------------------------------------------------------- */

export const getEmail = action({
  args: {
    userId: v.string(),
    messageId: v.string(),
  },

  handler: async (
    ctx,
    args,
  ): Promise<
    ReturnType<typeof normalizeMessage> & {
      caseId: string | null;
    }
  > => {
    const inbox = await requireInbox(
      ctx,
      args.userId,
    );

    const message =
      await requestAgentMail<AgentMailMessage>(
        `/inboxes/${encodeURIComponent(inbox.inboxId)}/messages/${encodeURIComponent(args.messageId)}`,
      );

    const caseMapping =
      message.thread_id
        ? await ctx.runQuery(
            internal.agentmail.getThreadCase,
            {
              userId: args.userId,
              threadId:
                message.thread_id,
            },
          )
        : null;

    return {
      ...normalizeMessage(message),
      caseId:
        caseMapping?.caseId ?? null,
    };
  },
});

/* -------------------------------------------------------------------------- */
/* Send new email                                                             */
/* -------------------------------------------------------------------------- */

export const sendEmail = action({
  args: {
    userId: v.string(),
    threadId: v.optional(v.string()),
    to: v.union(
      v.string(),
      v.array(v.string()),
    ),
    subject: v.string(),
    text: v.string(),
  },

  handler: async (
    ctx,
    args,
  ): Promise<SendResponse> => {
    const inbox = await requireInbox(
      ctx,
      args.userId,
    );

    const subject = args.subject.trim();
    const text = args.text.trim();

    if (!subject) {
      throw new Error(
        "Email subject cannot be empty.",
      );
    }

    if (!text) {
      throw new Error(
        "Email body cannot be empty.",
      );
    }

    const recipients = (
      Array.isArray(args.to)
        ? args.to
        : [args.to]
    )
      .map(value => value.trim())
      .filter(Boolean);

    if (recipients.length === 0) {
      throw new Error(
        "At least one recipient is required.",
      );
    }

    if (recipients.length > 50) {
      throw new Error(
        "Too many recipients.",
      );
    }

    const applicationThread =
      args.threadId
        ? await ctx.runQuery(
            internal.agents.chat.getApplicationThread,
            {
              threadId:
                args.threadId,
            },
          )
        : null;

    const result =
      await requestAgentMail<SendResponse>(
        `/inboxes/${encodeURIComponent(inbox.inboxId)}/messages/send`,
        {
          method: "POST",
          body: JSON.stringify({
            to: recipients,
            subject,
            text,
          }),
        },
      );

    await ctx.runMutation(
      internal.agentmail.recordAgentOutboundEmail,
      {
        userId: args.userId,
        caseId:
          applicationThread?.caseId,
        agentId:
          applicationThread?.agentId,
        messageId:
          result.message_id,
        threadId:
          result.thread_id,
        to: recipients,
        subject,
        text,
      },
    );

    return result;
  },
});

/* -------------------------------------------------------------------------- */
/* Reply as Witness                                                           */
/* -------------------------------------------------------------------------- */

export const replyAsAgent = action({
  args: {
    userId: v.string(),
    threadId: v.optional(v.string()),
    messageId: v.string(),
    text: v.string(),
  },

  handler: async (
    ctx,
    args,
  ): Promise<SendResponse> => {
    const inbox = await requireInbox(
      ctx,
      args.userId,
    );

    const text = args.text.trim();

    if (!text) {
      throw new Error(
        "Reply cannot be empty.",
      );
    }

    const applicationThread =
      args.threadId
        ? await ctx.runQuery(
            internal.agents.chat.getApplicationThread,
            {
              threadId:
                args.threadId,
            },
          )
        : null;

    const result =
      await requestAgentMail<SendResponse>(
        `/inboxes/${encodeURIComponent(inbox.inboxId)}/messages/${encodeURIComponent(args.messageId)}/reply`,
        {
          method: "POST",
          body: JSON.stringify({
            text,
          }),
        },
      );

    let caseId =
      applicationThread?.caseId;

    if (!caseId) {
      const messageCase =
        await ctx.runQuery(
          internal.agentmail.getMessageCase,
          {
            userId: args.userId,
            messageId:
              args.messageId,
          },
        );

      caseId = messageCase?.caseId;
    }

    await ctx.runMutation(
      internal.agentmail.recordAgentOutboundEmail,
      {
        userId: args.userId,
        caseId,
        agentId:
          applicationThread?.agentId,
        messageId:
          result.message_id,
        threadId:
          result.thread_id,
        parentMessageId:
          args.messageId,
        text,
      },
    );

    return result;
  },
});

/* -------------------------------------------------------------------------- */
/* User Inbox reply                                                           */
/* -------------------------------------------------------------------------- */

export const replyToEmail = action({
  args: {
    inboxItemId: v.id("inboxItems"),
    text: v.string(),
  },

  handler: async (
    ctx,
    args,
  ): Promise<SendResponse> => {
    const user =
      await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("Unauthorized.");
    }

    const text = args.text.trim();

    if (!text) {
      throw new Error(
        "Reply cannot be empty.",
      );
    }

    const item =
      await ctx.runQuery(
        internal.inboxQueries.getForUser,
        {
          id: args.inboxItemId,
          userId: user._id,
        },
      );

    if (
      !item ||
      item.types !== "email" ||
      item.source !== "agentmail" ||
      !item.externalId
    ) {
      throw new Error(
        "Email cannot be replied to.",
      );
    }

    const inbox =
      await ctx.runQuery(
        internal.agentmail.getUserInbox,
        {},
      );

    if (!inbox) {
      throw new Error(
        "AgentMail inbox not found.",
      );
    }

    const result =
      await requestAgentMail<SendResponse>(
        `/inboxes/${encodeURIComponent(inbox.inboxId)}/messages/${encodeURIComponent(item.externalId)}/reply`,
        {
          method: "POST",
          body: JSON.stringify({
            text,
          }),
        },
      );

    await ctx.runMutation(
      internal.agentmail.markReplySent,
      {
        inboxItemId:
          item._id,
        userId:
          user._id,
        text,
        outboundId:
          result.message_id,
        threadId:
          result.thread_id,
        actor: "user",
      },
    );

    return result;
  },
});