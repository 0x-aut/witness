<script setup lang="ts">
definePageMeta({
  layout: "use",
  middleware: "auth",
})

useSeoMeta({
  title: "New Chat"
})

import { useSession } from "@@/lib/auth-client";

const { data: session } = await useSession(useFetch);

</script>

<template>
  <div class="font-sans unmodified-font-sans mx-auto flex h-full w-full flex-col px-1 py-0">
    <UIAppsChatbox :displayName="session?.user.displayUsername" class="min-h-0 flex-1" />
  </div>
</template>