<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  widgets: Array<{
    _id: string;
    type: string;
    data: Record<string, any>;
  }>;
}>();

const documentWidgets = computed(() =>
  props.widgets.filter(widget => widget.type === "document"),
);

const otherWidgets = computed(() =>
  props.widgets.filter(widget => widget.type !== "document"),
);
</script>

<template>
  <div
    v-if="widgets.length"
    class="space-y-4"
  >
    <UIElementsCaseDocumentWidget
      v-if="documentWidgets.length"
      :documents="
        documentWidgets.map(widget => ({
          ...widget.data,
        }))
      "
    />

    <template
      v-for="widget in otherWidgets"
      :key="widget._id"
    >
      <UIElementsCaseWebsiteWidget
        v-if="widget.type === 'link'"
        :data="widget.data"
      />

      <UIElementsCaseResearchWidget
        v-else-if="widget.type === 'research'"
        :data="widget.data"
      />

      <UIElementsCaseGenericWidget
        v-else
        :type="widget.type"
        :data="widget.data"
      />
    </template>
  </div>
</template>