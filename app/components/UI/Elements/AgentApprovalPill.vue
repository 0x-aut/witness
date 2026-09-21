<script setup lang="ts">
import { SmoothCorners } from "@lisse/vue";
import { Check, X } from "@lucide/vue";

interface PendingApproval {
  id: string;
  prompt: string;
}

const props = defineProps<{
  action: PendingApproval | null;
  busy?: boolean;
}>();

const emit = defineEmits<{
  allow: [];
  deny: [];
}>();
</script>

<template>
  <div class="flex w-full items-center justify-center gap-x-2">
    <SmoothCorners
      :corners="{ radius: 999, smoothing: 0.65 }"
      :middle-border="{ width: 1, color: '#E3E3E3', opacity: 1 }"
    >
      <div class="flex min-h-11 w-[420px] max-w-[calc(100vw-96px)] items-center bg-white px-4 py-2.5">
        <p class="unmodified-font-sans max-h-20 overflow-y-auto text-sm font-medium leading-5 text-[#121212]">
          {{ action?.prompt }}
        </p>
      </div>
    </SmoothCorners>

    <SmoothCorners
      as-child
      :corners="{ radius: 999, smoothing: 0.7 }"
    >
      <button
        type="button"
        aria-label="Allow"
        :disabled="busy"
        class="flex h-9 w-9 shrink-0 items-center justify-center bg-[#121212] text-white transition-opacity duration-150 hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-60"
        @click="emit('allow')"
      >
        <Check :size="15" :stroke-width="2.2" />
      </button>
    </SmoothCorners>

    <SmoothCorners
      as-child
      :corners="{ radius: 999, smoothing: 0.7 }"
    >
      <button
        type="button"
        aria-label="Deny"
        :disabled="busy"
        class="flex h-9 w-9 shrink-0 items-center justify-center bg-[#121212] text-white transition-opacity duration-150 hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-60"
        @click="emit('deny')"
      >
        <X :size="15" :stroke-width="2.1" />
      </button>
    </SmoothCorners>
  </div>
</template>