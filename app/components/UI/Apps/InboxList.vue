<script setup lang="ts">
import type { Id } from "@@/convex/_generated/dataModel";
import {
  Bell,
  CheckCheck,
  ChevronDown,
  Mail,
  Star,
} from "@lucide/vue";

type InboxItem = {
  _id: Id<"inboxItems">;
  types: "email" | "alert" | "notification" | "agent_update" | "case_update";
  title: string;
  preview: string;
  read: boolean;
  starred: boolean;
  sender?: string;
  subject?: string;
  updatedAt: number;
};

const props = defineProps<{
  items: InboxItem[];
  selectedId: Id<"inboxItems"> | null;
  unreadCount: number;
}>();

const emit = defineEmits<{
  select: [id: Id<"inboxItems">];
  toggleStar: [id: Id<"inboxItems">];
  markAllRead: [];
}>();

const filter = ref<"all" | InboxItem["types"]>("all");

const filters = [
  { value: "all", label: "All" },
  { value: "email", label: "Emails" },
  { value: "alert", label: "Alerts" },
  { value: "agent_update", label: "Agents" },
  { value: "case_update", label: "Cases" },
] as const;

const filteredItems = computed(() => {
  if (filter.value === "all") return props.items;
  return props.items.filter(item => item.types === filter.value);
});

const iconFor = (type: InboxItem["types"]) => {
  if (type === "email") return Mail;
  return Bell;
};

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
};
</script>

<template>
  <aside class="flex h-full w-90 shrink-0 flex-col border-r border-black/6">
    <header class="flex h-16 shrink-0 items-center justify-between border-b border-black/6 px-5">
      <div class="flex items-center gap-2">
        <h1 class="text-[15px] font-medium">Inbox</h1>

        <span
          v-if="unreadCount"
          class="flex min-w-5 items-center justify-center rounded-full bg-black px-1.5 py-0.5 text-[10px] font-medium text-white"
        >
          {{ unreadCount }}
        </span>
      </div>

      <button
        v-if="unreadCount"
        type="button"
        class="flex items-center gap-1.5 text-[12px] text-black/45 transition hover:text-black"
        @click="emit('markAllRead')"
      >
        <CheckCheck :size="14" :stroke-width="1.7" />
        Mark read
      </button>
    </header>

    <div class="flex items-center gap-1 border-b border-black/6 px-3 py-2">
      <button
        v-for="entry in filters"
        :key="entry.value"
        type="button"
        class="rounded-full px-3 py-1.5 text-[11px] transition"
        :class="filter === entry.value ? 'bg-black text-white' : 'text-black/45 hover:bg-black/5 hover:text-black'"
        @click="filter = entry.value"
      >
        {{ entry.label }}
      </button>

      <ChevronDown class="ml-auto text-black/25" :size="14" :stroke-width="1.8" />
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto">
      <button
        v-for="item in filteredItems"
        :key="item._id"
        type="button"
        class="group flex w-full gap-3 border-b border-black/5 px-4 py-4 text-left transition"
        :class="[
          selectedId === item._id ? 'bg-black/[0.035]' : 'hover:bg-black/[0.025]',
          !item.read ? 'bg-black/[0.018]' : '',
        ]"
        @click="emit('select', item._id)"
      >
        <div
          class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          :class="item.read ? 'bg-black/[0.045] text-black/35' : 'bg-black text-white'"
        >
          <component
            :is="iconFor(item.types)"
            :size="15"
            :stroke-width="1.8"
          />
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex items-start gap-2">
            <span
              class="min-w-0 flex-1 truncate text-[12px]"
              :class="item.read ? 'font-normal text-black/70' : 'font-medium text-black'"
            >
              {{ item.title }}
            </span>

            <span class="shrink-0 text-[10px] text-black/30">
              {{ formatDate(item.updatedAt) }}
            </span>
          </div>

          <p class="mt-1 truncate text-[11px] leading-4 text-black/40">
            {{ item.preview }}
          </p>
        </div>

        <button
          type="button"
          class="mt-0.5 shrink-0 opacity-0 transition group-hover:opacity-100"
          :class="item.starred ? 'opacity-100' : ''"
          @click.stop="emit('toggleStar', item._id)"
        >
          <Star
            :size="14"
            :stroke-width="1.7"
            :fill="item.starred ? 'currentColor' : 'none'"
            :class="item.starred ? 'text-black' : 'text-black/30'"
          />
        </button>
      </button>

      <div
        v-if="!filteredItems.length"
        class="flex h-full min-h-70 items-center justify-center px-8 text-center"
      >
        <div>
          <div class="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.04]">
            <Bell :size="17" :stroke-width="1.7" class="text-black/30" />
          </div>

          <p class="text-[13px] font-medium text-black/65">
            No notifications
          </p>

          <p class="mt-1 text-[11px] leading-4 text-black/35">
            Important updates and requests from Witness will appear here.
          </p>
        </div>
      </div>
    </div>
  </aside>
</template>