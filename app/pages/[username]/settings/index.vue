<script setup lang="ts">
definePageMeta({ layout: 'set', })

useSeoMeta({
  title: "Settings"
})

const route = useRoute()
const username = route.params.username as string;

await navigateTo(`/${username}/settings/integrations`, { replace: true })
</script>

<template>
  <div class="font-sans unmodified-font-sans p-6">
    <h1 class="unmodified-font-sans m-0 mb-4.5 text-sm text-[#6B6B6B]"></h1>
  </div>
</template>