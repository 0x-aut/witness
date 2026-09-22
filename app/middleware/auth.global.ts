import { authClient } from "@@/lib/auth-client";

export default defineNuxtRouteMiddleware(async (to) => {
  const publicRoutes = ["/", "/signin", "/signup"];

  if (publicRoutes.includes(to.path)) {
    return;
  }

  // Better Auth's session cookie lives on the Convex domain.
  // Nuxt SSR cannot access that cross-origin cookie, so authentication
  // must be checked in the browser.
  if (import.meta.server) {
    return;
  }

  const { data: session, error } = await authClient.getSession();

  if (error || !session?.user) {
    return navigateTo({
      path: "/signin",
      query: {
        redirect: to.fullPath,
      },
    });
  }
});