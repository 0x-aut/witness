import { createTool } from "@convex-dev/agent";
import { z } from "zod/v4";
import { internal } from "../../_generated/api";

export const getAgentIdentity = createTool({
  description: `
Get the Witness Agent's own email identity.

Use this when you need to know the email address you are sending from,
tell the user the Agent's email address, or identify the Witness mailbox.
`.trim(),

  inputSchema: z.object({}),

  execute: async (ctx, _input): Promise<string> => {
    if (!ctx.userId) {
      throw new Error("Missing authenticated user.");
    }

    const result = await ctx.runAction(
      internal.agentmails.actions.getAgentIdentity,
      {
        userId: ctx.userId,
      },
    );

    return JSON.stringify(result);
  },
});

export const listAgentEmails = createTool({
  description: `
List recent incoming emails received by the Witness Agent.

Use this when you need recent correspondence or want to inspect what has arrived.
The results include message IDs and thread IDs.

Use getAgentEmail when you need the complete contents of a specific email.
`.trim(),

  inputSchema: z.object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("Maximum number of emails to return. Defaults to 20."),

    from: z
      .string()
      .optional()
      .describe("Filter emails by sender."),

    to: z
      .string()
      .optional()
      .describe("Filter emails by recipient."),

    subject: z
      .string()
      .optional()
      .describe("Filter emails by subject."),
  }),

  execute: async (ctx, input): Promise<string> => {
    if (!ctx.userId) {
      throw new Error("Missing authenticated user.");
    }

    const result = await ctx.runAction(
      internal.agentmails.actions.listEmails,
      {
        userId: ctx.userId,
        limit: input.limit,
        from: input.from,
        to: input.to,
        subject: input.subject,
      },
    );

    return JSON.stringify(result);
  },
});

export const searchAgentEmails = createTool({
  description: `
Search the Witness Agent's incoming email history.

Use this when you need historical context about a person, company, claim,
invoice, reference number, appointment, request, dispute, or specific phrase.

Search is full-text across sender, recipients, subject, and message body.

Use getAgentEmail after finding a relevant message when you need the complete email.
`.trim(),

  inputSchema: z.object({
    query: z
      .string()
      .min(2)
      .max(500)
      .describe(
        "Person, company, issue, claim number, invoice number, phrase, or other search context.",
      ),

    limit: z
      .number()
      .int()
      .min(1)
      .max(25)
      .optional()
      .describe("Maximum number of matches to return. Defaults to 10."),
  }),

  execute: async (ctx, input): Promise<string> => {
    if (!ctx.userId) {
      throw new Error("Missing authenticated user.");
    }

    const result = await ctx.runAction(
      internal.agentmails.actions.searchEmails,
      {
        userId: ctx.userId,
        query: input.query,
        limit: input.limit,
      },
    );

    return JSON.stringify(result);
  },
});

export const getAgentEmail = createTool({
  description: `
Retrieve a specific email from the Witness Agent's mailbox.

Use a message ID returned by listAgentEmails or searchAgentEmails.

Returns the full available email contents and metadata, including sender,
recipients, subject, body, thread ID, attachments, and Case association when known.
`.trim(),

  inputSchema: z.object({
    messageId: z
      .string()
      .min(1)
      .describe("Exact AgentMail message ID returned by another email tool."),
  }),

  execute: async (ctx, input): Promise<string> => {
    if (!ctx.userId) {
      throw new Error("Missing authenticated user.");
    }

    const result = await ctx.runAction(
      internal.agentmails.actions.getEmail,
      {
        userId: ctx.userId,
        messageId: input.messageId,
      },
    );

    return JSON.stringify(result);
  },
});

export const sendEmail = createTool({
  description: `
Send a new email from Witness's own AgentMail inbox.

This is an external side effect. For consequential communication,
ask the user for approval with askUser before sending unless the user
has already explicitly authorized the action.

The email is sent from Witness's AgentMail identity.
`.trim(),

  inputSchema: z.object({
    to: z
      .union([
        z.email(),
        z.array(z.email()),
      ])
      .describe("Recipient email address or addresses."),

    subject: z
      .string()
      .min(1)
      .max(200)
      .describe("Email subject."),

    text: z
      .string()
      .min(1)
      .max(10000)
      .describe("Plain-text email body."),
  }),

  execute: async (ctx, input): Promise<string> => {
    if (!ctx.userId) {
      throw new Error("Missing authenticated user.");
    }

    const result = await ctx.runAction(
      internal.agentmails.actions.sendEmail,
      {
        userId: ctx.userId,
        threadId: ctx.threadId,
        to: input.to,
        subject: input.subject,
        text: input.text,
      },
    );

    return JSON.stringify(result);
  },
});

export const replyToEmail = createTool({
  description: `
Reply to an existing email from Witness's own AgentMail inbox.

The message ID must come from listAgentEmails, searchAgentEmails, or getAgentEmail.

This is an external side effect. For consequential communication,
ask the user for approval with askUser before replying unless the user
has already explicitly authorized the action.

The reply stays in the existing AgentMail thread.
`.trim(),

  inputSchema: z.object({
    messageId: z
      .string()
      .min(1)
      .describe("Exact AgentMail message ID being replied to."),

    text: z
      .string()
      .min(1)
      .max(10000)
      .describe("Plain-text reply body."),
  }),

  execute: async (ctx, input): Promise<string> => {
    if (!ctx.userId) {
      throw new Error("Missing authenticated user.");
    }

    const result = await ctx.runAction(
      internal.agentmails.actions.replyAsAgent,
      {
        userId: ctx.userId,
        threadId: ctx.threadId,
        messageId: input.messageId,
        text: input.text,
      },
    );

    return JSON.stringify(result);
  },
});