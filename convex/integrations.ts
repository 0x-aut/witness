"use node";

import { Composio } from "@composio/core";
import { v } from "convex/values";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";

import { authComponent } from "./betterAuth/auth";

import {
  INTEGRATIONS,
  type IntegrationProvider,
} from "../shared/integrations";

function getComposio() {
  const apiKey =
    process.env.COMPOSIO_API_KEY;

  if (!apiKey) {
    throw new Error(
      "COMPOSIO_API_KEY is not configured.",
    );
  }

  return new Composio({
    apiKey,
  });
}

function getIntegrationProvider(
  provider: string,
): IntegrationProvider {
  if (
    !Object.prototype.hasOwnProperty.call(
      INTEGRATIONS,
      provider,
    )
  ) {
    throw new Error(
      `Unsupported integration provider: ${provider}`,
    );
  }

  return provider as IntegrationProvider;
}

function validateCallbackUrl(
  callbackUrl: string,
  provider: string,
) {
  const siteUrl =
    process.env.SITE_URL;

  if (!siteUrl) {
    throw new Error(
      "SITE_URL is not configured.",
    );
  }

  let callback: URL;
  let site: URL;

  try {
    callback = new URL(callbackUrl);
    site = new URL(siteUrl);
  } catch {
    throw new Error(
      "Invalid callback URL.",
    );
  }

  if (
    callback.origin !==
    site.origin
  ) {
    throw new Error(
      "Callback URL must belong to the Witness application.",
    );
  }

  if (
    !callback.pathname.endsWith(
      "/settings/integrations/callback",
    )
  ) {
    throw new Error(
      "Invalid integration callback path.",
    );
  }

  if (
    callback.searchParams.get(
      "provider",
    ) !== provider
  ) {
    throw new Error(
      "Callback provider does not match the integration provider.",
    );
  }
}

export const createConnection =
  action({
    args: {
      provider: v.string(),
      callbackUrl: v.string(),
    },

    handler: async (
      ctx,
      args,
    ) => {
      const user =
        await authComponent.getAuthUser(
          ctx,
        );

      if (!user) {
        throw new Error(
          "Unauthorized.",
        );
      }

      const provider =
        getIntegrationProvider(
          args.provider,
        );

      validateCallbackUrl(
        args.callbackUrl,
        provider,
      );

      const integration =
        INTEGRATIONS[provider];

      const composio =
        getComposio();

      /*
       * `sessions.create()` is the current
       * canonical Composio session API.
       */
      const session =
        await composio.sessions.create(
          user._id,
          {
            toolkits: [
              integration.composioToolkit,
            ],
          },
        );

      /*
       * Manual authorization is appropriate
       * for a Settings / Integrations UI.
       */
      const connectionRequest =
        await session.authorize(
          integration.composioToolkit,
          {
            callbackUrl:
              args.callbackUrl,
          },
        );

      return {
        redirectUrl:
          connectionRequest.redirectUrl,

        requestId:
          connectionRequest.id,
      };
    },
  });

export const completeConnection =
  action({
    args: {
      provider: v.string(),
      connectedAccountId:
        v.string(),
    },

    handler: async (
      ctx,
      args,
    ) => {
      const user =
        await authComponent.getAuthUser(
          ctx,
        );

      if (!user) {
        throw new Error(
          "Unauthorized.",
        );
      }

      const provider =
        getIntegrationProvider(
          args.provider,
        );

      const integration =
        INTEGRATIONS[provider];

      const composio =
        getComposio();

      /*
       * Never trust connectedAccountId by itself.
       *
       * We query Composio using the authenticated
       * Witness user ID + expected toolkit, then
       * verify that the returned account matches
       * the ID supplied by the callback.
       */
      const accounts =
        await composio.connectedAccounts.list(
          {
            userIds: [
              user._id,
            ],
            toolkitSlugs: [
              integration.composioToolkit,
            ],
          },
        );

      const account =
        accounts.items.find(
          item =>
            item.id ===
            args.connectedAccountId,
        );

      if (!account) {
        throw new Error(
          "Connected account does not belong to the current user.",
        );
      }

      if (
        account.toolkit.slug !==
        integration.composioToolkit
      ) {
        throw new Error(
          "Connected account toolkit does not match the requested integration.",
        );
      }

      if (
        account.status !==
        "ACTIVE"
      ) {
        throw new Error(
          `Connected account is not active. Current status: ${account.status}`,
        );
      }

      await ctx.runMutation(
        internal.integrationMutations.saveConnection,
        {
          userId: user._id,
          provider,
          toolkit:
            integration.composioToolkit,
          connectionId:
            account.id,
        },
      );

      return {
        success: true,
      };
    },
  });


export const disconnectConnection = action({
  args: { provider: v.string() },

  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized.");

    const provider = getIntegrationProvider(args.provider);
    const integration = await ctx.runQuery(internal.integrationQueries.getConnectionForUser, { userId: user._id, provider });

    if (!integration?.connectionId) {
      throw new Error("Integration is not connected.");
    }

    const composio = getComposio();

    const accounts = await composio.connectedAccounts.list({
      userIds: [user._id],
      toolkitSlugs: [INTEGRATIONS[provider].composioToolkit],
    });

    const account = accounts.items.find(item => item.id === integration.connectionId);

    if (!account) {
      throw new Error("Connected account not found.");
    }

    await composio.connectedAccounts.delete(account.id);

    await ctx.runMutation(internal.integrationMutations.markDisconnected, {
      userId: user._id,
      provider,
    });

    return { success: true };
  },
});