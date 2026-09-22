<script setup lang="ts">
definePageMeta({
  layout: "use",
})

useSeoMeta({
  title: "New Chat"
})

import { authClient } from "@@/lib/auth-client";

const session = ref<Awaited<ReturnType<typeof authClient.getSession>>["data"]>(null);

onMounted(async () => {
  const result = await authClient.getSession();
  session.value = result.data;
});


</script>

<template>
  <div class="font-sans unmodified-font-sans mx-auto flex h-full w-full flex-col px-1 py-0">
    <UIAppsChatbox :displayName="session?.user.displayUsername" class="min-h-0 flex-1" />
  </div>
</template>