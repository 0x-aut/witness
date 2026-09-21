<script setup lang="ts">
defineProps<{
  block: {
    _id: string;
    type: "narrative" | "widget";
    text?: string;
    widgetId?: string;
    widget?: {
      _id: string;
      type:
        | "email"
        | "research"
        | "document"
        | "action"
        | "approval"
        | "question"
        | "link"
        | "result";
      data: unknown;
    } | null;
  };
}>();
</script>

<template>
  <UIElementsCaseNarrativeBlock
    v-if="block.type === 'narrative'"
    :text="block.text ?? ''"
  />

  <UIElementsCaseWidgetBlock
    v-else-if="block.type === 'widget' && block.widget"
    :widget="block.widget"
  />
</template>