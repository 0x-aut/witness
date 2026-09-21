import { authClient } from "@@/lib/auth-client";

export default defineNuxtRouteMiddleware(async (to) => {
  const publicRoutes = ["/signin", "/signup"];

  if (publicRoutes.includes(to.path)) {
    return;
  }

  // if (import.meta.server) {
  //   return;
  // }

  const { data: session, error } = await authClient.getSession(useFetch);

  if (error || !session?.user) {
    return navigateTo({
      path: "/signin",
      query: {
        redirect: to.fullPath,
      },
    });
  }
});