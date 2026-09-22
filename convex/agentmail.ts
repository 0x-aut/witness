import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { authComponent } from "./betterAuth/auth";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const getUserInbox = internalQuery({
  args: {},

  handler: async ctx => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      return null;
    }

    return await ctx.db
      .query("agentMailInboxes")
      .withIndex("by_user_id", q => q.eq("userId", user._id))
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
      .withIndex("by_user_id", q => q.eq("userId", user._id))
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
      .withIndex("by_user_id", q => q.eq("userId", user._id))
      .unique();
  },
});

async function appendEmailWidget(
  ctx: MutationCtx,
  userId: string,
  caseId: Id<"cases">,
  data: Record<string, unknown>,
  now: number,
) {
  const widgetId = await ctx.db.insert("caseWidgets", {
    userId,
    caseId,
    type: "email",
    data,
    createdAt: now,
    updatedAt: now,
  });

  const latestBlock = await ctx.db
    .query("caseBlocks")
    .withIndex("by_case_id_order", q => q.eq("caseId", caseId))
    .order("desc")
    .first();

  if (latestBlock?.type === "widget") {
    await ctx.db.patch(latestBlock._id, {
      widgetIds: [...(latestBlock.widgetIds ?? []), widgetId],
      updatedAt: now,
    });
  } else {
    await ctx.db.insert("caseBlocks", {
      userId,
      caseId,
      type: "widget",
      order: latestBlock ? latestBlock.order + 1000 : 1000,
      widgetIds: [widgetId],
      createdAt: now,
      updatedAt: now,
    });
  }

  return widgetId;
};

export const getThreadCase = internalQuery({
  args: {
    userId: v.string(),
    threadId: v.string(),
  },

  handler: async (ctx, args) => {
    const thread = await ctx.db
      .query("agentMailThreads")
      .withIndex("by_thread_id", q => q.eq("threadId", args.threadId))
      .unique();

    if (!thread || thread.userId !== args.userId) {
      return null;
    }

    return thread;
  },
});

export const getThreadForCase = internalQuery({
  args: {
    userId: v.string(),
    caseId: v.id("cases"),
  },

  handler: async (ctx, args) => {
    const thread = await ctx.db
      .query("agentThreads")
      .withIndex("by_case_id", q => q.eq("caseId", args.caseId))
      .order("desc")
      .first();

    if (!thread || thread.userId !== args.userId) {
      return null;
    }

    return thread;
  },
});

export const associateEmailToCase = internalMutation({
  args: {
    userId: v.string(),
    inboxItemId: v.id("inboxItems"),
    caseId: v.id("cases"),
  },

  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.inboxItemId);
    const caseData = await ctx.db.get(args.caseId);

    if (!item || item.userId !== args.userId) {
      throw new Error("Inbox item not found.");
    }

    if (!caseData || caseData.userId !== args.userId) {
      throw new Error("Case not found.");
    }

    if (item.types !== "email" || item.source !== "agentmail") {
      throw new Error("Only AgentMail emails can be attached to Cases.");
    }

    if (item.caseId && item.caseId !== args.caseId) {
      throw new Error("Email is already attached to another Case.");
    }

    const now = Date.now();
    const newlyAssociated = !item.caseId;

    if (item.threadId) {
      const existingThread = await ctx.db
        .query("agentMailThreads")
        .withIndex("by_thread_id", q => q.eq("threadId", item.threadId!))
        .unique();

      if (existingThread) {
        if (
          existingThread.userId !== args.userId ||
          (existingThread.caseId && existingThread.caseId !== args.caseId)
        ) {
          throw new Error("AgentMail thread belongs to another Case.");
        }

        await ctx.db.patch(existingThread._id, {
          caseId: args.caseId,
          updatedAt: now,
        });
      } else {
        const inbox = await ctx.db
          .query("agentMailInboxes")
          .withIndex("by_user_id", q => q.eq("userId", args.userId))
          .unique();

        if (!inbox) {
          throw new Error("AgentMail inbox not found.");
        }

        await ctx.db.insert("agentMailThreads", {
          userId: args.userId,
          inboxId: inbox.inboxId,
          threadId: item.threadId,
          caseId: args.caseId,
          updatedAt: now,
        });
      }
    }

    if (!newlyAssociated) {
      await ctx.db.patch(item._id, {
        updatedAt: now,
      });

      return args.caseId;
    }

    await ctx.db.patch(item._id, {
      caseId: args.caseId,
      updatedAt: now,
    });

    await ctx.db.insert("caseActivities", {
      userId: args.userId,
      caseId: args.caseId,
      type: "external_response",
      title: "Email attached to Case",
      description: item.subject || item.preview,
      metadata: {
        inboxItemId: item._id,
        messageId: item.externalId,
        threadId: item.threadId,
        sender: item.sender,
      },
      createdAt: now,
    });

    await appendEmailWidget(
      ctx,
      args.userId,
      args.caseId,
      {
        direction: "inbound",
        inboxItemId: item._id,
        messageId: item.externalId,
        threadId: item.threadId,
        sender: item.sender,
        subject: item.subject,
        content: item.content,
      },
      now,
    );

    await ctx.db.patch(args.caseId, {
      updatedAt: now,
    });

    return args.caseId;
  },
});

export const createCaseFromEmail = internalMutation({
  args: {
    userId: v.string(),
    inboxItemId: v.id("inboxItems"),
  },

  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.inboxItemId);

    if (!item || item.userId !== args.userId) {
      throw new Error("Inbox item not found.");
    }

    if (item.caseId) {
      return item.caseId;
    }

    const now = Date.now();
    const title = (
      item.subject ||
      `Email from ${item.sender || "unknown sender"}`
    ).slice(0, 100);

    const caseId = await ctx.db.insert("cases", {
      userId: args.userId,
      title,
      originalPrompt: item.content.slice(0, 5000),
      summary: item.preview.slice(0, 1000),
      category: "Email",
      status: "active",
      updatedAt: now,
    });

    await ctx.db.insert("caseActivities", {
      userId: args.userId,
      caseId,
      type: "created",
      title: "Case created from incoming email",
      description: item.subject || item.preview,
      metadata: {
        inboxItemId: item._id,
        messageId: item.externalId,
        threadId: item.threadId,
      },
      createdAt: now,
    });

    await ctx.runMutation(
      internal.agentmail.associateEmailToCase,
      {
        userId: args.userId,
        inboxItemId: args.inboxItemId,
        caseId,
      },
    );

    return caseId;
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

    if (!inbox) {
      return;
    }

    const existing = await ctx.db
      .query("inboxItems")
      .withIndex(
        "by_user_id_external_id",
        q =>
          q
            .eq("userId", inbox.userId)
            .eq("externalId", message.message_id),
      )
      .unique();

    if (existing) {
      return;
    }

    const threadMapping = message.thread_id
      ? await ctx.db
          .query("agentMailThreads")
          .withIndex(
            "by_thread_id",
            q => q.eq("threadId", message.thread_id),
          )
          .unique()
      : null;

    const caseId =
      threadMapping?.userId === inbox.userId
        ? threadMapping.caseId
        : undefined;

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

    // Insert without caseId first.
    // Association is performed through one path below so the
    // Case activity/widget/thread mapping stays consistent.
    const itemId =
      await ctx.db.insert(
        "inboxItems",
        {
          userId: inbox.userId,
          types: "email",
    
          title:
            message.subject ||
            message.from_ ||
            message.from ||
            "New email",
    
          preview,
          content,
    
          read: false,
          starred: false,
    
          draftStatus:
            "drafting",
    
          source:
            "agentmail",
    
          externalId:
            message.message_id,
    
          threadId:
            message.thread_id,
    
          sender:
            message.from_ ||
            message.from,
    
          subject:
            message.subject,
    
          updatedAt:
            Date.now(),
        },
      );

    await ctx.scheduler.runAfter(
      0,
      internal.agentmails.actions.generateReplyDraft,
      {
        userId:
          inbox.userId,
        inboxItemId:
          itemId,
      },
    );

    if (caseId) {
      await ctx.runMutation(
        internal.agentmail.associateEmailToCase,
        {
          userId: inbox.userId,
          inboxItemId: itemId,
          caseId,
        },
      );
    }
  },
});

export const saveReplyDraft = internalMutation({
  args: {
    userId: v.string(),
    inboxItemId: v.id("inboxItems"),
    status: v.union(
      v.literal("drafting"),
      v.literal("ready"),
      v.literal("error"),
      v.literal("sent"),
      v.literal("dismissed"),
    ),
    draftText: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const item = await ctx.db.get(
      args.inboxItemId,
    );

    if (
      !item ||
      item.userId !== args.userId
    ) {
      throw new Error(
        "Inbox item not found.",
      );
    }

    await ctx.db.patch(
      args.inboxItemId,
      {
        draftStatus: args.status,
        draftText: args.draftText,
        updatedAt: Date.now(),
      },
    );
  },
});

export const dismissReplyDraft = mutation({
  args: {
    inboxItemId: v.id("inboxItems"),
  },

  handler: async (ctx, args) => {
    const user =
      await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("Unauthorized.");
    }

    const item = await ctx.db.get(
      args.inboxItemId,
    );

    if (
      !item ||
      item.userId !== user._id
    ) {
      throw new Error(
        "Inbox item not found.",
      );
    }

    await ctx.db.patch(
      args.inboxItemId,
      {
        draftStatus: "dismissed",
        updatedAt: Date.now(),
      },
    );

    return true;
  },
});

export const markReplySent = internalMutation({
  args: {
    inboxItemId: v.id("inboxItems"),
    userId: v.string(),
    text: v.string(),
    outboundId: v.string(),
    threadId: v.string(),
    actor: v.union(
      v.literal("user"),
      v.literal("witness"),
    ),
  },

  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.inboxItemId);

    if (!item || item.userId !== args.userId) {
      throw new Error("Inbox item not found.");
    }

    const now = Date.now();

    await ctx.db.patch(item._id, {
      read: true,
      preview: `${
        args.actor === "witness"
          ? "Witness"
          : "You"
      }: ${args.text.slice(0, 180)}`,
      threadId: args.threadId,
      draftStatus: "sent",
      draftText: undefined,
      updatedAt: now,
    });

    if (!item.caseId) {
      return;
    }

    const inbox = await ctx.db
      .query("agentMailInboxes")
      .withIndex("by_user_id", q => q.eq("userId", args.userId))
      .unique();

    if (!inbox) {
      throw new Error("AgentMail inbox not found.");
    }

    const existingThread = await ctx.db
      .query("agentMailThreads")
      .withIndex(
        "by_thread_id",
        q => q.eq("threadId", args.threadId),
      )
      .unique();

    if (existingThread) {
      if (
        existingThread.userId !== args.userId ||
        (
          existingThread.caseId &&
          existingThread.caseId !== item.caseId
        )
      ) {
        throw new Error(
          "AgentMail thread belongs to another Case.",
        );
      }

      await ctx.db.patch(existingThread._id, {
        caseId: item.caseId,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("agentMailThreads", {
        userId: args.userId,
        inboxId: inbox.inboxId,
        threadId: args.threadId,
        caseId: item.caseId,
        updatedAt: now,
      });
    }

    await ctx.db.insert("caseActivities", {
      userId: args.userId,
      caseId: item.caseId,
      type: "email",
      title:
        args.actor === "witness"
          ? "Witness sent an email reply"
          : "You replied to an email",
      description: args.text.slice(0, 500),
      metadata: {
        inboxItemId: item._id,
        parentMessageId: item.externalId,
        outboundId: args.outboundId,
        threadId: args.threadId,
        actor: args.actor,
      },
      createdAt: now,
    });

    await appendEmailWidget(
      ctx,
      args.userId,
      item.caseId,
      {
        direction: "outbound",
        actor: args.actor,
        inboxItemId: item._id,
        messageId: args.outboundId,
        threadId: args.threadId,
        subject: item.subject,
        content: args.text,
      },
      now,
    );

    await ctx.db.patch(item.caseId, {
      updatedAt: now,
    });
  },
});

export const getUserInboxByUserId = internalQuery({
  args: {
    userId: v.string(),
  },

  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentMailInboxes")
      .withIndex("by_user_id", q => q.eq("userId", args.userId))
      .unique();
  },
});

export const getMessageCase = internalQuery({
  args: {
    userId: v.string(),
    messageId: v.string(),
  },

  handler: async (ctx, args) => {
    const item = await ctx.db
      .query("inboxItems")
      .withIndex("by_user_id_external_id", q =>
        q.eq("userId", args.userId).eq("externalId", args.messageId),
      )
      .unique();

    return item?.caseId ? { caseId: item.caseId } : null;
  },
});

export const recordAgentOutboundEmail = internalMutation({
  args: {
    userId: v.string(),
    caseId: v.optional(v.id("cases")),
    agentId: v.optional(v.id("agents")),
    messageId: v.string(),
    threadId: v.string(),
    parentMessageId: v.optional(v.string()),
    to: v.optional(v.array(v.string())),
    subject: v.optional(v.string()),
    text: v.string(),
  },

  handler: async (ctx, args) => {
    let caseId = args.caseId;

    if (!caseId) {
      const mapping = await ctx.db
        .query("agentMailThreads")
        .withIndex("by_user_id_thread_id", q =>
          q.eq("userId", args.userId).eq("threadId", args.threadId),
        )
        .unique();

      caseId = mapping?.caseId;
    }

    if (!caseId) {
      return;
    }

    const now = Date.now();

    await ctx.db.insert("caseActivities", {
      userId: args.userId,
      caseId,
      agentId: args.agentId,
      type: "email",
      title: "Witness sent an email",
      description: args.text.slice(0, 500),
      metadata: {
        messageId: args.messageId,
        threadId: args.threadId,
        parentMessageId: args.parentMessageId,
        to: args.to,
        subject: args.subject,
      },
      createdAt: now,
    });

    await ctx.db.patch(caseId, {
      updatedAt: now,
    });
  },
});