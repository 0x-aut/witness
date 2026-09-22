<script setup lang="ts">
definePageMeta({
  layout: "use",
});

import { authClient } from "@@/lib/auth-client";

const route = useRoute();

const session = ref<Awaited<ReturnType<typeof authClient.getSession>>["data"]>(null);

onMounted(async () => {
  const result = await authClient.getSession();
  session.value = result.data;
});


const threadId = computed(
  () => route.params.threadId as string,
);

useSeoMeta({
  title: "Chat",
});
</script>

<template>
  <div
    class="font-sans unmodified-font-sans mx-auto flex h-full w-full flex-col px-1 py-0"
  >
    <UIAppsChatbox
      :display-name="session?.user.displayUsername"
      :thread-id="threadId"
      class="min-h-0 flex-1"
    />
  </div>
</template>