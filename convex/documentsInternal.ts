import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getFileForAgent = internalQuery({
  args: {
    userId: v.string(),
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);

    if (!file) {
      throw new Error("File not found");
    }

    if (file.userId !== args.userId) {
      throw new Error("You do not have access to this file");
    }

    if (file.caseId) {
      const caseDoc = await ctx.db.get(file.caseId);

      if (!caseDoc || caseDoc.userId !== args.userId) {
        throw new Error("You do not have access to this case");
      }
    }

    return file;
  },
});

export const markProcessing = internalMutation({
  args: {
    fileId: v.id("files"),
    mode: v.union(
      v.literal("fast"),
      v.literal("auto"),
      v.literal("ocr"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.fileId, {
      parseStatus: "processing",
      parseMode: args.mode,
      parseError: undefined,
    });
  },
});

export const saveParseResult = internalMutation({
  args: {
    fileId: v.id("files"),
    markdown: v.string(),
    summary: v.optional(v.string()),
    mode: v.union(
      v.literal("fast"),
      v.literal("auto"),
      v.literal("ocr"),
    ),
    originalCharCount: v.number(),
    storedCharCount: v.number(),
    truncated: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.fileId, {
      parseStatus: "parsed",
      parsedMarkdown: args.markdown,
      parsedSummary: args.summary,
      parsedAt: Date.now(),
      parseMode: args.mode,
      parseError: undefined,
      parsedCharCount: args.originalCharCount,
      parsedTruncated: args.truncated,
    });
  },
});

export const saveParseError = internalMutation({
  args: {
    fileId: v.id("files"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.fileId, {
      parseStatus: "error",
      parseError: args.error,
    });
  },
});