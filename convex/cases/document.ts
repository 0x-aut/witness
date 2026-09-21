import { query } from "../_generated/server";

import { v } from "convex/values";

import { getCurrentUser } from "../agents/threads";

export const get = query({
  args: {
    caseId: v.id("cases"),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const caseData = await ctx.db.get(args.caseId);

    if (!caseData || caseData.userId !== user._id) {
      throw new Error("Case not found.");
    }

    const blocks = await ctx.db
      .query("caseBlocks")
      .withIndex(
        "by_case_id_order",
        q => q.eq("caseId", args.caseId),
      )
      .order("asc")
      .collect();

    const documentBlocks = [];

    for (const block of blocks) {
      if (block.type === "narrative") {
        documentBlocks.push({
          ...block,
          widget: null,
        });

        continue;
      }

      if (!block.widgetId) {
        continue;
      }

      const widget = await ctx.db.get(
        block.widgetId,
      );

      if (!widget || widget.userId !== user._id) {
        continue;
      }

      documentBlocks.push({
        ...block,
        widget,
      });
    }

    return {
      caseId: args.caseId,
      blocks: documentBlocks,
    };
  },
});