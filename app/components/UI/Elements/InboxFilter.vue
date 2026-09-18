<script setup lang="ts">
import {
  Bell,
  CaseSensitive,
  CircleAlert,
  Mail,
} from "@lucide/vue";

type FilterValue = Record<string, string[]>;

const props = withDefaults(
  defineProps<{
    modelValue?: FilterValue;
  }>(),
  {
    modelValue: () => ({}),
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: FilterValue];
  change: [value: FilterValue];
  close: [];
}>();

const filters = [
  {
    label: "Notification type",
    multiple: true,
    options: [
      { label: "Emails", value: "email" },
      { label: "Alerts", value: "alert" },
      { label: "Agent updates", value: "agent" },
      { label: "Case updates", value: "case" },
    ],
  },
  {
    label: "Source",
    options: [
      { label: "Witness", value: "witness", icon: Bell },
      { label: "Email", value: "email", icon: Mail },
    ],
  },
  {
    label: "Status",
    options: [
      { label: "Unread", value: "unread", icon: CircleAlert },
      { label: "Read", value: "read", icon: CaseSensitive },
    ],
  },
];

function updateFilters(value: FilterValue) {
  emit("update:modelValue", value);
  emit("change", value);
}
</script>

<template>
  <div class="absolute right-0 top-[calc(100%+6px)] z-50">
    <UIElementsFilterMenu
      :filters="filters"
      :model-value="props.modelValue"
      @update:model-value="updateFilters"
      @close="emit('close')"
    />
  </div>
</template>