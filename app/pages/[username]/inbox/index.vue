<script setup lang="ts">
import type { Id } from "@@/convex/_generated/dataModel";

definePageMeta({
  layout: "use",
});

useSeoMeta({
  title: "Inbox",
});

const {
  items,
  unreadCount,
  markItemRead,
  toggleItemStar,
  markEverythingRead,
} = useInbox();

const selectedId = ref<Id<"inboxItems"> | null>(null);

const inboxItems = computed(() => items.value ?? []);

const selectedItem = computed(() =>
  inboxItems.value.find(item => item._id === selectedId.value) ?? null,
);

watch(
  inboxItems,
  nextItems => {
    if (!nextItems.length) {
      selectedId.value = null;
      return;
    }

    if (!selectedId.value || !nextItems.some(item => item._id === selectedId.value)) {
      selectedId.value = nextItems[0]._id;
    }
  },
  { immediate: true },
);

watch(selectedId, async id => {
  if (!id) return;

  const item = inboxItems.value.find(item => item._id === id);

  if (item && !item.read) {
    await markItemRead(id);
  }
});
</script>

<template>
  <div class="font-sans unmodified-font-sans flex h-full w-full overflow-hidden">
    <UIAppsInboxList
      :items="inboxItems"
      :selected-id="selectedId"
      :unread-count="unreadCount ?? 0"
      @select="selectedId = $event"
      @toggle-star="toggleItemStar"
      @mark-all-read="markEverythingRead"
    />

    <UIAppsInboxContent
      :item="selectedItem"
    />
  </div>
</template>