<script setup lang="ts">
definePageMeta({
  layout: "use",
})

const route = useRoute()
const username = route.params.username as string;

await navigateTo(`/${username}/agent`, { replace: true })

</script>

<template>
  <div class="w-full h-full items-center justify-center">
    <span>Hello to witness app</span>
  </div>
</template>