<script setup lang="ts">
import { SmoothCorners } from "@lisse/vue";
import { ArrowUp, X } from "@lucide/vue";

interface PendingQuestion {
  id: string;
  prompt: string;
  options: string[];
}

const props = defineProps<{
  action: PendingQuestion | null;
  busy?: boolean;
}>();

const emit = defineEmits<{
  answer: [response: string];
  decline: [];
}>();

const answer = ref("");

const canSubmit = computed(() => Boolean(answer.value.trim()) && Boolean(props.action) && !props.busy);

function submitAnswer() {
  const response = answer.value.trim();

  if (!response || !props.action || props.busy) {
    return;
  }

  emit("answer", response);
  answer.value = "";
}

function selectOption(option: string) {
  if (!props.action || props.busy) {
    return;
  }

  emit("answer", option);
}

function handlePrimaryAction() {
  if (canSubmit.value) {
    submitAnswer();
    return;
  }

  if (!props.busy) {
    emit("decline");
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();

    if (canSubmit.value) {
      submitAnswer();
    }
  }
}
</script>

<template>
  <div class="flex w-full items-end justify-center gap-x-2">
    <SmoothCorners
      :corners="{ radius: 22, smoothing: 0.65 }"
      :middle-border="{ width: 1, color: '#E3E3E3', opacity: 1 }"
    >
      <div class="w-full max-w-[560px] bg-white px-4 py-3">
        <div class="max-h-32 overflow-y-auto">
          <p class="unmodified-font-sans text-sm font-medium leading-5 text-[#121212]">
            {{ action?.prompt }}
          </p>
        </div>

        <div
          v-if="action?.options.length"
          class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          <SmoothCorners
            v-for="option in action.options"
            :key="option"
            as-child
            :corners="{ radius: 12, smoothing: 0.6 }"
            :middle-border="{ width: 1, color: '#E3E3E3', opacity: 1 }"
          >
            <button
              type="button"
              :disabled="busy"
              class="unmodified-font-sans min-h-10 w-full bg-[#F8F8F8] px-3 py-2 text-left text-sm font-medium text-[#222] transition-colors duration-150 hover:bg-[#F1F1F1] disabled:cursor-not-allowed disabled:opacity-50"
              @click="selectOption(option)"
            >
              {{ option }}
            </button>
          </SmoothCorners>
        </div>

        <div class="mt-3 flex items-end">
          <textarea
            v-model="answer"
            rows="1"
            maxlength="2000"
            :disabled="busy"
            placeholder="Type your answer..."
            class="unmodified-font-sans max-h-28 min-h-8 w-full resize-none bg-transparent py-1 text-sm font-medium leading-5 text-[#121212] outline-none placeholder:text-[#969696] disabled:opacity-50"
            @keydown="handleKeyDown"
          />
        </div>
      </div>
    </SmoothCorners>

    <SmoothCorners
      as-child
      :corners="{ radius: 999, smoothing: 0.7 }"
    >
      <button
        type="button"
        :aria-label="canSubmit ? 'Send answer' : 'Skip question'"
        :disabled="busy"
        class="flex h-9 w-9 shrink-0 items-center justify-center bg-[#121212] text-white transition-opacity duration-150 hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-60"
        @click="handlePrimaryAction"
      >
        <ArrowUp
          v-if="canSubmit"
          :size="15"
          :stroke-width="2.2"
        />

        <X
          v-else
          :size="15"
          :stroke-width="2.1"
        />
      </button>
    </SmoothCorners>
  </div>
</template>