import { createTool } from "@convex-dev/agent";
import { z } from "zod/v4";

import {
  internal,
} from "../../_generated/api";

export const getUserContext = createTool({
  description: `
Read the user's persistent personal context.

This contains information the user explicitly wants Witness to remember
about them across Cases and Agent conversations.

Use this before substantive work when the information could affect how
you communicate with the user, understand their circumstances, or approach
their Case.

Treat it as user-provided context, not as independently verified evidence.
Do not invent details that are not present.
`.trim(),

  inputSchema: z.object({}),

  execute: async (ctx) => {
    if (!ctx.userId) {
      throw new Error("Missing authenticated user.");
    }

    return await ctx.runQuery(
      internal.profile.getAgentContext,
      {},
    );
  },
});