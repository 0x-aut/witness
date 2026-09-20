<script setup lang="ts">
import { SmoothCorners, useSmoothCorners } from "@lisse/vue";
import { ArrowUp, Plus, X } from "@lucide/vue";
import { useAgentChat } from "~/composables/useAgentChat";

const props = defineProps<{ 
  displayName: string | null | undefined;
  threadId?: string;
  id?: string;
  required?: boolean;
  placeholder?: string;
}>()


// Chat state lives in the composable: page -> useAgentChat -> /api/agent/chat.
// The loading pill (`currentStepText`) is driven by backend `step` events,
// falling back to a local rotation only while the backend sends none.
const {
  messages,
  isLoading,
  isCreating,
  currentStepText,
  requestError,
  sendAgentMessage,
  abortAgentCreation,
} = useAgentChat(props.threadId);


const route = useRoute();

const username = route.params.username as string;

const message = ref("");
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const messageListRef = ref<HTMLElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

const pendingDraft = ref("");
const abortedRef = ref(false);

const hasStarted = computed(() => messages.value.length > 0 || isCreating.value);
const hasDraft = computed(() => message.value.trim().length > 0);
const showHero = computed(() => !hasDraft.value && !hasStarted.value);

const canSend = computed(
  () => message.value.trim().length > 0 && !isLoading.value && !isCreating.value,
);

const MAX_TEXTAREA_HEIGHT = 200;

function adjustHeight() {
  const textarea = textareaRef.value;
  if (!textarea) return;

  textarea.style.height = "auto";
  textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
}

async function scrollToBottom() {
  await nextTick();

  const list = messageListRef.value;
  if (!list) return;

  list.scrollTo({
    top: list.scrollHeight,
    behavior: "smooth",
  });
}

function restoreDraft() {
  message.value = pendingDraft.value;
  pendingDraft.value = "";

  nextTick(() => {
    adjustHeight();
    textareaRef.value?.focus();
  });
}

function abortCreation() {
  abortedRef.value = true;
  abortAgentCreation();
  restoreDraft();
}

async function sendMessage() {
  const userMessage = message.value.trim();

  if (!userMessage || isLoading.value || isCreating.value) return;

  requestError.value = "";
  abortedRef.value = false;

  pendingDraft.value = userMessage;
  message.value = "";

  await nextTick(adjustHeight);
  await scrollToBottom();

  try {
    await sendAgentMessage(userMessage);
    pendingDraft.value = "";
  } catch (error) {
    if (abortedRef.value) return;
    if (error instanceof DOMException && error.name === "AbortError") return;

    // `requestError` is already set inside the composable.
    // Restore the message so the user can retry.
    restoreDraft();
  } finally {
    await scrollToBottom();
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

function openFilePicker() {
  fileInputRef.value?.click();
}

function handleFiles(event: Event) {
  const input = event.target as HTMLInputElement;

  if (!input.files?.length) return;

  // File upload handling will be connected to Convex later.
  // For now, simply accept the selected files.
  console.log("Selected files:", Array.from(input.files));

  // Allow selecting the same file again later.
  input.value = "";
}

onMounted(() => {
  adjustHeight();
});

onBeforeUnmount(() => {
  abortAgentCreation();
});

watch(message, () => nextTick(adjustHeight));
</script>

<template>
  <div class="flex h-full min-h-0 w-full flex-col">
    <!-- Message list -->
    <div
      v-if="hasStarted || requestError"
      ref="messageListRef"
      class="noscrollbar min-h-0 flex-1 overflow-y-auto px-1 py-1"
      aria-live="polite"
    >
      <div class="mx-auto w-full max-w-185 px-1">
        <GSAPTransition
          group
          :stagger="0.06"
          :hidden="{ opacity: 0, y: 10 }"
          :duration="0.3"
        >
          <div
            v-for="(chatMessage, idx) in messages"
            :key="chatMessage.id"
            :data-index="idx"
            :class="[
              'flex w-full',
              chatMessage.role === 'user' ? 'justify-end' : 'justify-start',
              idx > 0 ? 'mt-4' : '',
            ]"
          >
            <UIElementsUserMessageBubble
              v-if="chatMessage.role === 'user'"
              :content="chatMessage.content"
            />
          
            <Markdown
              v-else
              :streaming="isLoading"
              :options="{ autoUnwrap: true, autoClose: true }"
              class="unmodified-font-sans font-normal assistant-markdown"
            >
              {{ chatMessage.content }}
            </Markdown>
          </div>
        </GSAPTransition>
  
        <p
          v-if="requestError"
          class="unmodified-font-sans mt-4 text-sm text-[#B42318]"
        >
          {{ requestError }}
        </p>
      </div>
    </div>

    <!-- Dock: hero (idle) + input/pill, centered idle, bottom docked active -->
    <div
      :class="[
        'w-full shrink-0',
        hasStarted ? 'pb-2 pt-4' : 'my-auto flex flex-col',
      ]"
    >
      <div class="mx-auto w-full max-w-185 px-1">

        <GSAPTransition
          :hidden="{ opacity: 0, y: -10 }"
          :duration="0.3"
        >
          <div
            v-if="showHero"
            class="mb-[22px] text-center"
          >
            <h1
              class="unmodified-font-sans m-0 mb-2 text-[26px] font-medium tracking-[-0.02em] text-[#121212]"
            >
              {{ props.displayName }} what went wrong?
            </h1>
          </div>
        </GSAPTransition>
  
        <div class="relative w-full">
          <GSAPTransition
            :hidden="{ opacity: 0, y: 12, scale: 0.97 }"
            :duration="0.35"
          >
            <!-- Input box -->
            <div
              v-if="!isCreating"
              key="chat-input"
              class="relative w-full"
            >
              <SmoothCorners
                as-child
                :corners="{ radius: 24, smoothing: 0.6 }"
                :middle-border="{
                  width: 1,
                  color: '#E3E3E3',
                  opacity: 1,
                }"
              >
                <div class="flex flex-col gap-y-1 bg-white p-2">
                  <textarea
                    ref="textareaRef"
                    v-model="message"
                    autofocus
                    rows="1"
                    placeholder="Tell witness what happened"
                    aria-label="Describe your issue"
                    class="unmodified-font-sans max-h-50 resize-none overflow-y-auto bg-transparent px-2 pb-1 pt-1.5 text-md font-medium text-[#121212] outline-none placeholder:text-[#8A8A8A]"
                    @keydown="handleKeyDown"
                  />
  
                  <div class="flex w-full items-center justify-between">
                    <!-- File attachment -->
                    <button
                      v-gsap.whileHover.to="{ scale: 1.08 }"
                      type="button"
                      aria-label="Add files"
                      class="flex h-8 w-8 items-center justify-center rounded-full text-[#6B6B6B] transition-colors duration-150 hover:bg-[#F4F4F4] hover:text-[#121212]"
                      @click="openFilePicker"
                    >
                      <Plus :size="18" :stroke-width="1.8" />
                    </button>
  
                    <input
                      ref="fileInputRef"
                      type="file"
                      multiple
                      class="hidden"
                      @change="handleFiles"
                    />
  
                    <!-- Send -->
                    <button
                      v-gsap.whileHover.to="{ scale: 1.08 }"
                      type="button"
                      aria-label="Send message"
                      :disabled="!canSend"
                      class="flex h-8 w-8 items-center justify-center rounded-full bg-[#121212] transition-opacity duration-150 disabled:cursor-not-allowed disabled:opacity-30"
                      @click="sendMessage"
                    >
                      <ArrowUp
                        :size="16"
                        :stroke-width="2"
                        color="#fff"
                      />
                    </button>
                  </div>
                </div>
              </SmoothCorners>
            </div>
  
            <!-- Loading pill + stop button -->
            <div
              v-else
              key="creating-pill"
              class="flex w-full items-center justify-center gap-x-2"
              role="status"
              aria-label="Creating your agent"
            >
              <SmoothCorners
                as-child
                :corners="{ radius: 999, smoothing: 0.6 }"
                :middle-border="{
                  width: 1,
                  color: '#E3E3E3',
                  opacity: 1,
                }"
              >
                <div
                  class="flex h-11 w-[320px] max-w-full items-center justify-center bg-white px-4"
                >
                  <GSAPTransition
                    :hidden="{ opacity: 0, y: 6 }"
                    :duration="0.25"
                  >
                    <span
                      :key="currentStepText"
                      class="loading-shimmer unmodified-font-sans truncate text-sm font-medium"
                      aria-live="polite"
                    >
                      {{ currentStepText }}
                    </span>
                  </GSAPTransition>
                </div>
              </SmoothCorners>
  
              <button
                v-gsap.whileHover.to="{ scale: 1.1 }"
                type="button"
                aria-label="Stop creating agent"
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#121212] transition-opacity duration-150 hover:opacity-85"
                @click="abortCreation"
              >
                <X
                  :size="14"
                  :stroke-width="2"
                  color="#fff"
                />
              </button>
            </div>
          </GSAPTransition>
        </div>
        
      </div>
      
    </div>
  </div>
</template>
