<script setup lang="ts">
import {
  FileText,
  Globe,
  Mail,
  Link,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  ExternalLink,
} from "@lucide/vue";

defineProps<{
  widget: {
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
  };
}>();

const widgetMeta = {
  email: {
    label: "Email",
    icon: Mail,
  },
  research: {
    label: "Research",
    icon: Globe,
  },
  document: {
    label: "Document",
    icon: FileText,
  },
  action: {
    label: "Action",
    icon: ClipboardCheck,
  },
  approval: {
    label: "Approval",
    icon: CheckCircle2,
  },
  question: {
    label: "Question",
    icon: CircleHelp,
  },
  link: {
    label: "Link",
    icon: Link,
  },
  result: {
    label: "Result",
    icon: CheckCircle2,
  },
} as const;
</script>

<template>
  <div
    class="my-2 rounded-[14px] border border-black/[0.06] bg-black/[0.025] p-4"
  >
    <div class="flex items-center gap-x-2">
      <div
        class="flex size-7 items-center justify-center rounded-[9px] bg-white"
      >
        <component
          :is="widgetMeta[widget.type].icon"
          :size="14"
          :stroke-width="1.7"
          class="text-black/45"
        />
      </div>

      <div>
        <p class="text-sm font-medium text-black/70">
          {{ widgetMeta[widget.type].label }}
        </p>

        <p class="text-[11px] text-black/30">
          Widget
        </p>
      </div>
    </div>

    <div class="mt-3 flex items-center gap-x-1.5 text-xs text-black/30">
      <ExternalLink
        :size="12"
        :stroke-width="1.7"
      />

      <span>
        Widget content will appear here.
      </span>
    </div>
  </div>
</template>