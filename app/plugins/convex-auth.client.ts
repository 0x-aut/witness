import { authClient } from "@@/lib/auth-client";

export default defineNuxtPlugin(() => {
  const convex = useConvexClient();

  convex.setAuth(async () => {
    const { data, error } = await authClient.convex.token();

    if (error || !data?.token) {
      return null;
    }

    return data.token;
  });
});