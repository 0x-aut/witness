import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../agents/threads";

export const update = mutation({
  args: {
    id: v.id("cases"),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    category: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("waiting_user"),
        v.literal("resolved"),
        v.literal("archived"),
      ),
    ),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const existing = await ctx.db.get(args.id);

    if (!existing || existing.userId !== user._id) {
      throw new Error("Case not found.");
    }

    const { id, ...updates } = args;

    const cleanedUpdates = Object.fromEntries(
      Object.entries(updates).filter(
        ([, value]) => value !== undefined,
      ),
    );

    await ctx.db.patch(id, {
      ...cleanedUpdates,
      updatedAt: Date.now(),
    });

    if (
      args.status &&
      args.status !== existing.status
    ) {
      const statusLabels = {
        active: "Active",
        waiting_user: "Waiting for you",
        resolved: "Resolved",
        archived: "Archived",
      };

      await ctx.db.insert("caseActivities", {
        userId: user._id,
        caseId: id,
        type: "status_changed",
        title: "Status changed",
        description:
          `Case moved to ${statusLabels[args.status]}.`,
        createdAt: Date.now(),
      });
    }

    return id;
  },
});