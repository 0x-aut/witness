import { AgentMail } from "@agentmail/convex";
import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { components, internal } from "./_generated/api";
import { authComponent } from "./betterAuth/auth";

const agentmail = new AgentMail(components.agentmail);


export const getUserInbox = internalQuery({
  args: {},

  handler: async ctx => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      return null;
    }

    return await ctx.db
      .query("agentMailInboxes")
      .withIndex("by_user_id", q =>
        q.eq("userId", user._id),
      )
      .unique();
  },
});

export const saveUserInbox = internalMutation({
  args: {
    inboxId: v.string(),
    email: v.string(),
  },

  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("Unauthorized.");
    }

    const existing = await ctx.db
      .query("agentMailInboxes")
      .withIndex("by_user_id", q =>
        q.eq("userId", user._id),
      )
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        inboxId: args.inboxId,
        email: args.email,
        updatedAt: now,
      });

      return existing._id;
    }

    return await ctx.db.insert("agentMailInboxes", {
      userId: user._id,
      inboxId: args.inboxId,
      email: args.email,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getInbox = query({
  args: {},

  handler: async ctx => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("Unauthorized.");
    }

    return await ctx.db
      .query("agentMailInboxes")
      .withIndex("by_user_id", q =>
        q.eq("userId", user._id),
      )
      .unique();
  },
});

export const replyToEmail = mutation({
  args: {
    inboxItemId: v.id("inboxItems"),
    text: v.string(),
  },

  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized.");

    const text = args.text.trim();
    if (!text) throw new Error("Reply cannot be empty.");

    const item = await ctx.db.get(args.inboxItemId);

    if (
      !item ||
      item.userId !== user._id ||
      item.types !== "email" ||
      item.source !== "agentmail" ||
      !item.externalId
    ) {
      throw new Error("Email cannot be replied to.");
    }

    const inbox = await ctx.db
      .query("agentMailInboxes")
      .withIndex("by_user_id", q => q.eq("userId", user._id))
      .unique();

    if (!inbox) throw new Error("AgentMail inbox not found.");

    const outbound = await agentmail.replyToMessage(
      ctx,
      inbox.inboxId,
      item.externalId,
      { text },
    );

    const now = Date.now();

    await ctx.db.patch(item._id, {
      read: true,
      preview: `You: ${text.slice(0, 180)}`,
      updatedAt: now,
    });

    if (item.caseId) {
      await ctx.db.insert("caseActivities", {
        userId: user._id,
        caseId: item.caseId,
        type: "email",
        title: "Witness replied to an email",
        description: text.slice(0, 500),
        metadata: {
          inboxItemId: item._id,
          parentMessageId: item.externalId,
          outbound,
        },
        createdAt: now,
      });
    }

    return outbound;
  },
});

export const onMessageReceived = internalMutation({
  args: {
    message: v.any(),
    thread: v.any(),
    eventId: v.string(),
  },

  handler: async (ctx, args) => {
    const message = args.message as {
      message_id: string;
      inbox_id: string;
      thread_id: string;
      from?: string;
      from_?: string;
      subject?: string;
      preview?: string;
      text?: string;
      extracted_text?: string;
      extracted_html?: string;
      html?: string;
    };

    const inbox = await ctx.db
      .query("agentMailInboxes")
      .withIndex("by_inbox_id", q => q.eq("inboxId", message.inbox_id))
      .unique();

    if (!inbox) return;

    const existing = await ctx.db
      .query("inboxItems")
      .withIndex("by_user_id_external_id", q =>
        q.eq("userId", inbox.userId).eq("externalId", message.message_id),
      )
      .unique();

    if (existing) return;

    const content =
      message.extracted_text ??
      message.text ??
      message.extracted_html ??
      message.html ??
      message.preview ??
      "";

    const preview = (
      message.preview ??
      content.replace(/\s+/g, " ")
    ).slice(0, 200);

    await ctx.db.insert("inboxItems", {
      userId: inbox.userId,
      types: "email",
      title: message.subject || message.from_ || message.from || "New email",
      preview,
      content,
      read: false,
      starred: false,
      source: "agentmail",
      externalId: message.message_id,
      threadId: message.thread_id,
      sender: message.from_ || message.from,
      subject: message.subject,
      updatedAt: Date.now(),
    });
  },
});


export const markReplySent = internalMutation({
  args: {
    inboxItemId: v.id("inboxItems"),
    userId: v.string(),
    text: v.string(),
    outboundId: v.string(),
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.inboxItemId);

    if (!item || item.userId !== args.userId) {
      throw new Error("Inbox item not found.");
    }

    const now = Date.now();

    await ctx.db.patch(item._id, {
      read: true,
      preview: `You: ${args.text.slice(0, 180)}`,
      threadId: args.threadId,
      updatedAt: now,
    });

    if (item.caseId) {
      await ctx.db.insert("caseActivities", {
        userId: args.userId,
        caseId: item.caseId,
        type: "email",
        title: "You replied to an email",
        description: args.text.slice(0, 500),
        metadata: {
          inboxItemId: item._id,
          parentMessageId: item.externalId,
          outboundId: args.outboundId,
          threadId: args.threadId,
        },
        createdAt: now,
      });
    }
  },
});