import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const saveConnection = internalMutation({
    args: {
      userId: v.string(),
      provider: v.string(),
      toolkit: v.string(),
      connectionId:
        v.string(),
    },

    handler: async (
      ctx,
      args,
    ) => {
      const existing =
        await ctx.db
          .query("integrations")
          .withIndex(
            "by_user_id_provider",
            q =>
              q
                .eq(
                  "userId",
                  args.userId,
                )
                .eq(
                  "provider",
                  args.provider,
                ),
          )
          .unique();

      const now =
        Date.now();

      if (existing) {
        await ctx.db.patch(
          existing._id,
          {
            toolkit:
              args.toolkit,

            connectionId:
              args.connectionId,

            status:
              "connected",

            updatedAt:
              now,
          },
        );

        return existing._id;
      }

      return await ctx.db.insert(
        "integrations",
        {
          userId:
            args.userId,

          provider:
            args.provider,

          toolkit:
            args.toolkit,

          connectionId:
            args.connectionId,

          status:
            "connected",

          updatedAt:
            now,
        },
      );
    },
});


export const markDisconnected = internalMutation({
  args: {
    userId: v.string(),
    provider: v.string(),
  },

  handler: async (ctx, args) => {
    const integration = await ctx.db
      .query("integrations")
      .withIndex("by_user_id_provider", q => q.eq("userId", args.userId).eq("provider", args.provider))
      .unique();

    if (!integration) return;

    await ctx.db.patch(integration._id, {
      connectionId: undefined,
      status: "disconnected",
      accountLabel: undefined,
      updatedAt: Date.now(),
    });
  },
});