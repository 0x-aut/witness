<script setup lang="ts">
import { Check, ChevronRight } from "@lucide/vue";
import { SmoothCorners } from "@lisse/vue";

export interface FilterOption {
  label: string;
  value: string;
  icon?: Component;
}

export interface FilterItem {
  label: string;
  icon?: Component;
  options: FilterOption[];
  multiple?: boolean;
}

const props = withDefaults(
  defineProps<{
    filters: FilterItem[];
    modelValue?: Record<string, string[]>;
  }>(),
  {
    modelValue: () => ({}),
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: Record<string, string[]>];
  close: [];
}>();

const activeFilter = ref<FilterItem | null>(null);

const selected = computed(() => props.modelValue);

function getSelectedValues(filter: FilterItem) {
  return selected.value[filter.label] ?? [];
}

function isSelected(filter: FilterItem, option: FilterOption) {
  return getSelectedValues(filter).includes(option.value);
}

function toggleOption(filter: FilterItem, option: FilterOption) {
  const current = [...getSelectedValues(filter)];

  if (filter.multiple) {
    const index = current.indexOf(option.value);

    if (index === -1) {
      current.push(option.value);
    } else {
      current.splice(index, 1);
    }
  } else {
    current.splice(0, current.length, option.value);
    activeFilter.value = null;
  }

  emit("update:modelValue", {
    ...selected.value,
    [filter.label]: current,
  });
}
</script>

<template>
  <div class="relative">
    <!-- Main menu -->
    <SmoothCorners
      as-child
      :corners="{ radius: 14, smoothing: 0.65 }"
      :middle-border="{
        width: 1,
        color: '#E3E3E3',
        opacity: 1,
      }"
    >
      <div
        v-gsap.fromTo="{
          opacity: 0,
          y: -5,
          scale: 0.97,
          duration: 0.2,
          ease: 'power2.out',
        }"
        class="w-[220px] bg-white p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
      >
        <div class="px-2.5 pb-2 pt-2">
          <span class="unmodified-font-sans text-xs font-medium text-[#777]">
            Filter
          </span>
        </div>

        <SmoothCorners
          v-for="filter in filters"
          :key="filter.label"
          as-child
          :corners="{ radius: 9, smoothing: 0.65 }"
        >
          <button
            type="button"
            class="group flex w-full items-center gap-x-2 bg-transparent px-2.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5F5F5]"
            @click="activeFilter = filter"
          >
            <component
              :is="filter.icon"
              v-if="filter.icon"
              :size="15"
              :stroke-width="1.8"
              class="shrink-0 text-[#6E6E6E]"
            />

            <span
              class="unmodified-font-sans min-w-0 flex-1 text-sm text-[#242424]"
            >
              {{ filter.label }}
            </span>

            <ChevronRight
              :size="14"
              :stroke-width="1.8"
              class="shrink-0 text-[#A0A0A0] transition-transform duration-150 group-hover:translate-x-0.5"
            />
          </button>
        </SmoothCorners>
      </div>
    </SmoothCorners>

    <!-- Side submenu -->
    <GSAPTransition
      :hidden="{
        opacity: 0,
        x: -8,
        scale: 0.97,
      }"
      :duration="0.2"
    >
      <div
        v-if="activeFilter"
        key="filter-submenu"
        class="absolute left-[calc(100%+6px)] top-0"
      >
        <SmoothCorners
          :corners="{ radius: 14, smoothing: 0.65 }"
          :middle-border="{
            width: 1,
            color: '#E3E3E3',
            opacity: 1,
          }"
          as-child
        >
          <div
            class="w-[210px] bg-white p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
          >
            <div class="px-2.5 pb-2 pt-2">
              <span
                class="unmodified-font-sans text-xs font-medium text-[#777]"
              >
                {{ activeFilter.label }}
              </span>
            </div>

            <SmoothCorners
              v-for="option in activeFilter.options"
              :key="option.value"
              as-child
              :corners="{ radius: 9, smoothing: 0.65 }"
            >
              <button
                type="button"
                class="flex w-full items-center gap-x-2 bg-transparent px-2.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5F5F5]"
                @click="toggleOption(activeFilter!, option)"
              >
                <component
                  :is="option.icon"
                  v-if="option.icon"
                  :size="15"
                  :stroke-width="1.8"
                  class="shrink-0 text-[#6E6E6E]"
                />

                <span
                  class="unmodified-font-sans min-w-0 flex-1 text-sm text-[#242424]"
                >
                  {{ option.label }}
                </span>

                <Check
                  v-if="
                    activeFilter.multiple &&
                    isSelected(activeFilter, option)
                  "
                  :size="15"
                  :stroke-width="2"
                  class="shrink-0 text-[#121212]"
                />
              </button>
            </SmoothCorners>
          </div>
        </SmoothCorners>
      </div>
    </GSAPTransition>
  </div>
</template>