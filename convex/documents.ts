"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const FIRECRAWL_URL = "https://api.firecrawl.dev/v2/parse";
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_STORED_MARKDOWN = 700_000;
const MAX_RETURNED_MARKDOWN = 80_000;

export const parseFile = internalAction({
  args: {
    userId: v.string(),
    fileId: v.id("files"),
    mode: v.union(
      v.literal("fast"),
      v.literal("auto"),
      v.literal("ocr"),
    ),
  },

  handler: async (ctx, args) => {
    const file = await ctx.runQuery(internal.documentsInternal.getFileForAgent, {
      userId: args.userId,
      fileId: args.fileId,
    });

    if (!file) {
      throw new Error("File not found");
    }

    // Reuse an existing successful parse.
    if (file.parseStatus === "parsed" && file.parsedMarkdown) {
      return {
        fileId: args.fileId,
        filename: file.filename,
        mode: file.parseMode ?? args.mode,
        markdown: file.parsedMarkdown.slice(0, MAX_RETURNED_MARKDOWN),
        summary: file.parsedSummary ?? null,
        cached: true,
        truncatedForAgent:
          file.parsedMarkdown.length > MAX_RETURNED_MARKDOWN,
      };
    }

    const blob = await ctx.storage.get(file.storageId);

    if (!blob) {
      throw new Error("Stored file could not be found");
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error("File exceeds Firecrawl's 50 MB parsing limit");
    }

    await ctx.runMutation(internal.documentsInternal.markProcessing, {
      fileId: args.fileId,
      mode: args.mode,
    });

    try {
      const form = new FormData();

      form.append(
        "file",
        blob,
        file.filename,
      );

      form.append(
        "formats",
        JSON.stringify(["markdown", "summary"]),
      );

      if (file.mimeType === "application/pdf") {
        form.append(
          "parsers",
          JSON.stringify([
            {
              type: "pdf",
              mode: args.mode,
              pages: true,
              pageMarkers: true,
            },
          ]),
        );
      }

      const response = await fetch(FIRECRAWL_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
        },
        body: form,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            payload?.message ||
            `Firecrawl returned ${response.status}`,
        );
      }

      const data = payload?.data ?? payload;

      const markdown =
        typeof data?.markdown === "string"
          ? data.markdown
          : "";

      const summary =
        typeof data?.summary === "string"
          ? data.summary
          : undefined;

      if (!markdown && !summary) {
        throw new Error("Firecrawl returned no parsed document content");
      }

      const originalCharCount = markdown.length;
      const truncated = originalCharCount > MAX_STORED_MARKDOWN;

      const storedMarkdown = markdown.slice(0, MAX_STORED_MARKDOWN);

      await ctx.runMutation(internal.documentsInternal.saveParseResult, {
        fileId: args.fileId,
        markdown: storedMarkdown,
        summary,
        mode: args.mode,
        originalCharCount,
        storedCharCount: storedMarkdown.length,
        truncated,
      });

      return {
        fileId: args.fileId,
        filename: file.filename,
        mode: args.mode,
        markdown: storedMarkdown.slice(0, MAX_RETURNED_MARKDOWN),
        summary: summary ?? null,
        cached: false,
        truncatedForAgent: storedMarkdown.length > MAX_RETURNED_MARKDOWN,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to parse document";

      await ctx.runMutation(internal.documentsInternal.saveParseError, {
        fileId: args.fileId,
        error: message,
      });

      throw new Error(message);
    }
  },
});