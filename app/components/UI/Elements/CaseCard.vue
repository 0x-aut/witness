<script setup lang="ts">
import { SmoothCorners } from "@lisse/vue";
import { ArrowUpRight, Trash2 } from "@lucide/vue";

interface CaseItem {
  _id: string;
  title: string;
  originalPrompt: string;
  summary?: string;
  category?: string;
  status:
    | "active"
    | "waiting_user"
    | "resolved"
    | "archived";
  updatedAt: number;
}

const props = defineProps<{
  caseItem: CaseItem;
}>();

const emit = defineEmits<{
  click: [];
  delete: [];
}>();

const statusLabel = computed(() => {
  switch (props.caseItem.status) {
    case "waiting_user":
      return "Waiting for you";
    case "resolved":
      return "Resolved";
    case "archived":
      return "Archived";
    default:
      return "Active";
  }
});

const statusClass = computed(() => {
  switch (props.caseItem.status) {
    case "waiting_user":
      return "bg-[#F4F4F4] text-[#666]";
    case "resolved":
      return "bg-[#EEF8F0] text-[#397344]";
    case "archived":
      return "bg-[#F1F1F1] text-[#8A8A8A]";
    default:
      return "bg-[#F3F3F3] text-[#555]";
  }
});

const updatedLabel = computed(() => {
  const diff = Date.now() - props.caseItem.updatedAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(props.caseItem.updatedAt).toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
    },
  );
});
</script>

<template>
  <SmoothCorners
    as-child
    :corners="{ radius: 18, smoothing: 0.6 }"
    :middle-border="{
      width: 1,
      color: '#E5E5E5',
      opacity: 1,
    }"
  >
    <div
      class="group flex min-h-50 w-full cursor-pointer flex-col bg-white p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#FCFCFC] hover:shadow-[0_6px_18px_rgba(0,0,0,0.04)]"
      role="link"
      tabindex="0"
      @click="emit('click')"
      @keydown.enter="emit('click')"
      @keydown.space.prevent="emit('click')"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <h3
            class="line-clamp-2 text-[15px] font-medium leading-5 text-[#121212]"
          >
            {{ caseItem.title }}
          </h3>
        </div>
  
        <ArrowUpRight
          :size="16"
          :stroke-width="1.7"
          class="shrink-0 text-[#A0A0A0] transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#121212]"
        />
      </div>
  
      <p
        class="mt-3 line-clamp-3 text-sm leading-5 text-[#6B6B6B]"
      >
        {{ caseItem.summary || caseItem.originalPrompt }}
      </p>
  
      <div class="mt-auto flex items-center justify-between gap-3 pt-6">
        <div class="flex min-w-0 items-center gap-2">
          <span
            :class="[
              'shrink-0 rounded-full px-2 py-1 text-[11px] font-medium',
              statusClass,
            ]"
          >
            {{ statusLabel }}
          </span>
  
          <span
            v-if="caseItem.category"
            class="truncate text-[11px] text-[#999]"
          >
            {{ caseItem.category }}
          </span>
        </div>
  
        <div class="flex items-center gap-2">
          <span class="shrink-0 text-[11px] text-[#999]">
            {{ updatedLabel }}
          </span>
  
          <SmoothCorners
            as-child
            :corners="{ radius: 9, smoothing: 0.6 }"
          >
            <button
              type="button"
              aria-label="Delete case"
              class="flex h-7 w-7 items-center justify-center bg-transparent text-[#999] opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-[#F0F0F0] hover:text-[#121212]"
              @click.stop="emit('delete')"
            >
              <Trash2
                :size="14"
                :stroke-width="1.7"
              />
            </button>
          </SmoothCorners>
        </div>
      </div>
    </div>
  </SmoothCorners>
</template>