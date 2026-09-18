<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { Check, Star } from "@lucide/vue";
import { SmoothCorners } from "@lisse/vue";

const showFilter = ref(false);
const filterAnchorRef = ref<HTMLElement | null>(null);
const filtersValue = ref<Record<string, string[]>>({});

function handleFilterChange(value: Record<string, string[]>) {
  filtersValue.value = value;
}

function handleOutsideClick(event: MouseEvent) {
  const target = event.target;

  if (!(target instanceof Node)) return;
  if (filterAnchorRef.value?.contains(target)) return;

  showFilter.value = false;
}

onMounted(() => {
  document.addEventListener("pointerdown", handleOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", handleOutsideClick);
});

const items = [
  {
    id: "inbox-001",
    type: "email",
    title: "Your claim has been denied",
    preview:
      "We’ve reviewed your claim and determined that the damage is not covered under your current policy.",
    time: "8 min ago",
    unread: false,
    case: "Car insurance claim",
  },
];

const selectedItems = ref<string[]>([]);

function toggleSelected(id: string, event: MouseEvent) {
  event.stopPropagation();

  const index = selectedItems.value.indexOf(id);

  if (index === -1) {
    selectedItems.value.push(id);
  } else {
    selectedItems.value.splice(index, 1);
  }
}

function isSelected(id: string) {
  return selectedItems.value.includes(id);
}

function openNotification(item: (typeof items)[number]) {
  console.log("Open notification:", item.id);
}

function toggleStar(item: (typeof items)[number], event: MouseEvent) {
  event.stopPropagation();
  console.log("Toggle star:", item.id);
}
</script>

<template>
  <div class="relative flex h-full min-h-0 flex-col">
    <nav
      class="flex shrink-0 items-center justify-between border-b border-[#E3E3E3] px-1.5 py-1.5"
    >
      <span
        class="unmodified-font-sans text-sm font-medium text-[#121212]"
      >
        Inbox
      </span>

      <!-- Filter can be restored here later -->
    </nav>

    <div class="noscrollbar min-h-0 flex-1 overflow-y-auto">
      <div
        v-for="item in items"
        :key="item.id"
        role="button"
        tabindex="0"
        class="group flex w-full items-center gap-x-3 border-b border-[#EEEEEE] px-3 py-2.5 text-left transition-colors duration-150 hover:bg-[#F7F7F7]"
        @click="openNotification(item)"
        @keydown.enter="openNotification(item)"
      >
        <SmoothCorners
          as-child
          :corners="{ radius: 5, smoothing: 0.6 }"
          :outer-border="{
            width: 1,
            color: '#E3E3E3',
            opacity: 1,
          }"
        >
          <button
            type="button"
            :aria-label="
              isSelected(item.id)
                ? 'Deselect notification'
                : 'Select notification'
            "
            :aria-pressed="isSelected(item.id)"
            :class="[
              'flex h-4.5 w-4.5 shrink-0 items-center justify-center transition-colors duration-150',
              isSelected(item.id)
                ? 'bg-[#0A84FF] text-white'
                : 'bg-transparent text-transparent hover:border-[#8F8F8F]',
            ]"
            @click="toggleSelected(item.id, $event)"
          >
            <Check
              v-if="isSelected(item.id)"
              :size="12"
              :stroke-width="2.5"
            />
          </button>
        </SmoothCorners>

        <!-- Notification content -->
        <div class="min-w-0 flex-1">
          <p
            :class="[
              'min-w-0 unmodified-font-sans truncate text-[15px] leading-5',
              item.unread
                ? 'font-medium text-[#121212]'
                : 'font-normal text-[#3F3F3F]',
            ]"
          >
            {{ item.title }}
          </p>
        
          <p
            class="mt-0.5 truncate text-[13px] unmodified-font-sans font-light leading-4.5 text-[#777777]"
          >
            {{ item.preview }}
          </p>
        </div>

        <!-- Star -->
        <SmoothCorners
          as-child
          :corners="{ radius: 999, smoothing: 0.6 }"
        >
          <span class="shrink-0">
            <button
              type="button"
              aria-label="Star notification"
              class="flex h-7 w-7 items-center justify-center text-[#A0A0A0] transition-colors duration-150 hover:bg-[#F0F0F0] hover:text-[#121212]"
              @click="toggleStar(item, $event)"
            >
              <Star
                :size="15"
                :stroke-width="1.7"
              />
            </button>
          </span>
        </SmoothCorners>
      </div>
    </div>
  </div>
</template>
