<script setup lang="ts">

definePageMeta({
  layout: "set",
})

const route = useRoute()
const username = route.params.username as string;

await navigateTo(`/${username}/settings/account/profile`, { replace: true })


</script>

<template>
  <div class="w-full h-full flex justify-center items-center">
    <Loader />
  </div>
</template>