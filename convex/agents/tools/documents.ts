import { createTool } from "@convex-dev/agent";
import { z } from "zod/v4";

import {
  internal,
} from "../../_generated/api";

import type { Id } from "../../_generated/dataModel";

export const parseDocument =
  createTool({
    description: `
Read and understand a document attached to the current Case.

Use this when the Case contains a document whose actual contents are
needed to continue the work.

This is the primary document-understanding tool for:
- insurance letters
- bank statements
- claim documents
- invoices
- contracts
- denial letters
- travel documents
- government forms
- PDFs
- DOCX/DOC documents
- spreadsheets
- other supported uploaded documents

The document is parsed through Firecrawl and the extracted content is
returned as clean, LLM-ready text.

For PDFs:
- auto is the default and uses normal extraction with OCR fallback
- fast is appropriate when you know the PDF contains selectable text
- ocr forces OCR and is useful for scanned/image-only PDFs

Do not ask the user to copy/paste document contents when the document
already exists in the Case.

Use the returned content as evidence. Do not invent information that
is not present in the document.
`.trim(),

    inputSchema: z.object({
      fileId:
        z.string()
          .min(1)
          .describe(
            "The file ID returned by getCaseFiles.",
          ),

      mode:
        z.enum([
          "fast",
          "auto",
          "ocr",
        ])
          .optional()
          .describe(
            "PDF parsing mode. Defaults to auto. OCR is useful for scanned PDFs.",
          ),
    }),

    execute: async (
      ctx,
      input,
    ): Promise<unknown> => {
      if (!ctx.userId) {
        throw new Error(
          "Missing authenticated user.",
        );
      }

      const mode =
        input.mode ??
        "auto";

      return await ctx.runAction(
        internal.documents
          .parseFile,
        {
          userId:
            ctx.userId,

          fileId:
            input.fileId as Id<"files">,

          mode,
        },
      );
    },
  });