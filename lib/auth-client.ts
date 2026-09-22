import { createAuthClient } from "better-auth/vue";
import { inferAdditionalFields, usernameClient } from "better-auth/client/plugins";
import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";


export const authClient = createAuthClient({
  baseURL: "https://successful-tapir-385.convex.site",

  plugins: [
    usernameClient(),

    inferAdditionalFields({
      user: {
        country: {
          type: "string",
        },
        state: {
          type: "string",
        },
      },
    }),

    convexClient(),
    crossDomainClient(),
  ],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient;