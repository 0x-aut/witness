import { APIError, betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { Pool } from "pg";
import { US_STATES, isUSState} from "#shared/utils/us-states";

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.NUXT_BETTER_AUTH_DATABASE,
    ssl: { rejectUnauthorized: false },
  }),
  baseURL: process.env.NUXT_BETTER_AUTH_URL,
  secret: process.env.NUXT_BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true
  },
  plugins: [
    username()
  ],
  user: {
    additionalFields: {
      country: {
        type: "string",
        input: true,
        defaultValue: "US",
        required: true
      },
      state: {
        type: "string",
        input: true,
        required: true
      }
    }
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (user.country !== "US" || !isUSState(user.state)) {
            throw new APIError("BAD_REQUEST", { message: "Only US locations are supported right now." })
          }
          return { data: user }
        },
      },
    },
  },
});