<script setup lang="ts">
defineProps<{
  text: string;
}>();
</script>

<template>
  <div
    v-if="text.trim()"
    class="whitespace-pre-wrap text-[16px] leading-[1.85] tracking-[-0.005em] text-black/74"
  >
    {{ text }}
  </div>
</template>