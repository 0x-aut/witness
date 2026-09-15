<script setup lang="ts">
import { SmoothCorners } from "@lisse/vue";

defineProps<{
  text: string;
}>();
</script>

<template>
  <div
    class="pointer-events-none absolute left-full top-1/2 z-50 ml-4 -translate-y-1/2 scale-95 opacity-0 transition-all duration-[350ms] ease-in-out group-hover:scale-100 group-hover:opacity-100"
  >
    <SmoothCorners
      as-child
      :corners="{ radius: 10, smoothing: 0.6 }"
      :middle-border="{
        color: '#E3E3E3',
        width: 1,
        opacity: 1
      }"
    >
      <div
        class="whitespace-nowrap bg-white px-2.5 py-1.5 shadow-[0_4px_14px_rgba(0,0,0,0.06)]"
      >
        <span
          class="unmodified-font-sans text-xs font-medium leading-4 text-[#3F3F3F]"
        >
          {{ text }}
        </span>
      </div>
    </SmoothCorners>
  </div>
</template>