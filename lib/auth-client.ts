import { createAuthClient } from "better-auth/vue";
import { inferAdditionalFields, usernameClient } from "better-auth/client/plugins";
import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";


function getSiteUrl() {
  const config = useRuntimeConfig()
 
  return config.public.convexSiteUrl
}

export const authClient = createAuthClient({
  baseURL: "https://resolute-avocet-407.convex.site",

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