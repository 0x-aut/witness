import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";
import betterAuth from "./betterAuth/convex.config";
import firecrawl from "@firecrawl/firecrawl-convex/convex.config";
import agentmail from "@agentmail/convex/convex.config";
import { v } from "convex/values";
import staticHosting from "@convex-dev/static-hosting/convex.config";

const app = defineApp({
  httpPrefix: "/api",
  env: {
    FIRECRAWL_API_KEY: v.string(),
    FIRECRAWL_WEBHOOK_SECRET: v.optional(v.string()),
    AGENTMAIL_API_KEY: v.string(),
    AGENTMAIL_WEBHOOK_SECRET: v.string(),
    QWEN_API_KEY: v.string(),
    QWEN_BASE_URL: v.string(),
  },
});

app.use(agent);
app.use(betterAuth);
app.use(agentmail);
app.use(staticHosting);

app.use(firecrawl, {
  httpPrefix: "/firecrawl/",
  env: {
    FIRECRAWL_API_KEY: app.env.FIRECRAWL_API_KEY,
    FIRECRAWL_WEBHOOK_SECRET:
      app.env.FIRECRAWL_WEBHOOK_SECRET,
  },
});

export default app;