import {
  createClient,
  type GenericCtx,
} from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import type { BetterAuthOptions } from "better-auth";
import { betterAuth } from "better-auth/minimal";
import { username } from "better-auth/plugins";

import { components } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import authConfig from "../auth.config";
import schema from "./schema";

import { isUSState } from "../../shared/utils/us-states";

const siteUrl = process.env.SITE_URL!;

export const authComponent = createClient<
  DataModel,
  typeof schema
>(components.betterAuth, {
  local: {
    schema: schema,
  },
});


export const createAuthOptions = (
  ctx: GenericCtx<DataModel>,
): BetterAuthOptions => ({
  appName: "Witness",

  // Better Auth now runs on Convex.
  baseURL: process.env.CONVEX_SITE_URL!,

  secret: process.env.NUXT_BETTER_AUTH_SECRET,

  // Convex is now the Better Auth database.
  database: authComponent.adapter(ctx),

  trustedOrigins: [siteUrl,],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  plugins: [
    username(),

    // Required for the cross-origin Nuxt/Vue frontend.
    crossDomain({ siteUrl }),

    // Connects Better Auth identity to Convex auth.
    convex({ authConfig }),
  ],

  user: {
    additionalFields: {
      country: {
        type: "string",
        input: true,
        defaultValue: "US",
        required: true,
      },

      state: {
        type: "string",
        input: true,
        required: true,
      },
    },
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (user.country !== "US" || !isUSState(user.state)) {
            throw new Error(
              "Only US locations are supported right now.",
            );
          }

          return {
            data: user,
          };
        },
      },
    },
  },
});

export const options = createAuthOptions({} as GenericCtx<DataModel>);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth(createAuthOptions(ctx));
};