import { query } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
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
          widgets: [],
        });

        continue;
      }

      const widgets = [];

      for (const widgetId of block.widgetIds ?? []) {
        const widget = await ctx.db.get(widgetId);

        if (!widget || widget.userId !== user._id) {
          continue;
        }

        if (widget.type === "document") {
          const data = widget.data as Record<string, unknown>;
          const storageId = data.storageId;

          if (typeof storageId === "string") {
            const url = await ctx.storage.getUrl(
              storageId as Id<"_storage">,
            );

            widgets.push({
              ...widget,
              data: {
                ...data,
                url,
              },
            });

            continue;
          }
        }

        widgets.push(widget);
      }

      if (!widgets.length) {
        continue;
      }

      documentBlocks.push({
        ...block,
        widgets,
      });
    }

    return {
      caseId: args.caseId,
      blocks: documentBlocks,
    };
  },
});