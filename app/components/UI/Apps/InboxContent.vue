<script setup lang="ts">
import { Inbox } from "@lucide/vue";
</script>

<template>
  <div class="w-full border-l border-[#E3E3E3] flex items-center justify-center">
    <div class="flex flex-col items-center gap-y-1.25">
      <div class="">
        <Inbox
          :size="110"
          :stroke-width="0.5"
          color="#121212"
        />
      </div>
      <span class="unmodified-font-sans tracking-[0.01em] text-[#6B6B6B] font-light text-sm">No notification selected</span>
    </div>
  </div>
</template>

