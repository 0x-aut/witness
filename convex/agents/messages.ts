import { query } from "../_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { listUIMessages } from "@convex-dev/agent";

import { components } from "../_generated/api";
import { authComponent } from "../betterAuth/auth";

export const listThreadMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
  },

  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    const thread = await ctx.runQuery(
      components.agent.threads.getThread,
      {
        threadId: args.threadId,
      },
    );

    if (thread?.userId !== user.userId) {
      throw new Error("Unauthorized.");
    }

    return await listUIMessages(ctx, components.agent, args);
  },
});