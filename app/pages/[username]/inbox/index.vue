<script setup lang="ts">
definePageMeta({
  layout: "use",
  middleware: "auth",
})

useSeoMeta({
  title: "Inbox"
})

</script>

<template>
  <div class="font-sans unmodified-font-sans mx-auto flex h-full w-full">
    <UIAppsInboxList class="flex w-90 shrink-0" />
    <UIAppsInboxContent class="w-full" />
  </div>
</template>