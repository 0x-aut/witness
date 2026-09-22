import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { AgentMail } from "@agentmail/convex";
import { components, internal } from "./_generated/api";
import { authComponent, createAuth } from "./betterAuth/auth";

const agentmail = new AgentMail(components.agentmail, {
  onMessageReceived: internal.agentmail.onMessageReceived,
});

const http = httpRouter();

authComponent.registerRoutes(http, createAuth, {
  cors: true,
});

http.route({
  path: "/agentmail/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) =>
    agentmail.handleWebhook(ctx, req),
  ),
});

export default http;