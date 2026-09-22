import { api } from "@@/convex/_generated/api";
import type { Id } from "@@/convex/_generated/dataModel";

export function useInbox() {
  const {
    data: items,
    isPending,
    error,
  } = useConvexQuery(api.inboxQueries.list);

  const {
    data: unreadCount,
  } = useConvexQuery(api.inboxQueries.unreadCount);

  const { mutate: markRead } = useConvexMutation(
    api.inboxMutations.markRead,
  );

  const { mutate: toggleStar } = useConvexMutation(
    api.inboxMutations.toggleStar,
  );

  const { mutate: markAllRead } = useConvexMutation(
    api.inboxMutations.markAllRead,
  );

  return {
    items,
    unreadCount,
    isPending,
    error,
    markItemRead: (id: Id<"inboxItems">) => markRead({ id }),
    toggleItemStar: (id: Id<"inboxItems">) => toggleStar({ id }),
    markEverythingRead: () => markAllRead({}),
  };
}