<script setup lang="ts">
import { ref } from "vue";
import { useSmoothCorners } from "@lisse/vue";

defineProps<{
  content: string;
}>();

const bubble = ref<HTMLElement | null>(null);

useSmoothCorners(bubble, {
  radius: 20,
  smoothing: 0.6,
});
</script>

<template>
  <div
    ref="bubble"
    class="unmodified-font-sans w-fit max-w-[70%] whitespace-pre-wrap wrap-break-words bg-[#0A84FF] px-3.5 py-2 text-sm leading-6 text-white"
  >
    {{ content }}
  </div>
</template>