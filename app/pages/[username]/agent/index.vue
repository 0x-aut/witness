<script setup lang="ts">
definePageMeta({
  layout: "use",
})

useSeoMeta({
  title: "New Chat"
})

</script>

<template>
  <div class="font-sans unmodified-font-sans mx-auto flex h-full w-full max-w-160 flex-col px-6 py-8">
    <UIAppsChatbox class="min-h-0 flex-1" />
  </div>
</template>