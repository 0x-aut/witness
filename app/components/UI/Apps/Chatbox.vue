<script setup lang="ts">
import { SmoothCorners } from "@lisse/vue";
import {
  ArrowUp,
  FileText,
  Plus,
  X,
} from "@lucide/vue";
import { useAgentChat } from "~/composables/useAgentChat";

interface PendingFile {
  file: File;
  previewUrl: string | null;
}

const props = defineProps<{
  displayName:
    | string
    | null
    | undefined;
  threadId?: string;
  id?: string;
  required?: boolean;
  placeholder?: string;
}>();

const {
  messages,
  threadId,

  isLoading,
  isCreating,
  isGenerating,
  isWaitingForUser,
  isUploadingFiles,
  isDecliningUserAction,

  currentStepText,
  requestError,

  pendingUserAction,

  sendAgentMessage,
  resolveUserAction,
  declineUserAction,
  abortAgentCreation,
} = useAgentChat(
  props.threadId,
);

const route = useRoute();

const username =
  route.params.username as string;

const message = ref("");
const textareaRef =
  ref<HTMLTextAreaElement | null>(
    null,
  );
const messageListRef =
  ref<HTMLElement | null>(null);
const fileInputRef =
  ref<HTMLInputElement | null>(
    null,
  );

const pendingDraft = ref("");
const abortedRef = ref(false);

const pendingFiles =
  ref<PendingFile[]>([]);

const MAX_FILES = 4;
const MAX_TEXTAREA_HEIGHT = 200;

const hasDraft = computed(
  () =>
    message.value.trim()
      .length > 0,
);

const showUploadInterruption =
  computed(
    () =>
      pendingUserAction.value
        ?.type === "upload_file",
  );

const hasStarted = computed(
  () =>
    messages.value.length > 0 ||
    isGenerating.value ||
    isWaitingForUser.value,
);

const showHero = computed(
  () =>
    !hasDraft.value &&
    !hasStarted.value,
);

const canSend = computed(
  () =>
    hasDraft.value &&
    !isLoading.value &&
    !isCreating.value &&
    !isWaitingForUser.value,
);

const displayedFiles =
  computed(() =>
    pendingFiles.value.slice(
      0,
      MAX_FILES,
    ),
  );

function adjustHeight() {
  const textarea =
    textareaRef.value;

  if (!textarea) {
    return;
  }

  textarea.style.height =
    "auto";

  textarea.style.height = `${Math.min(
    textarea.scrollHeight,
    MAX_TEXTAREA_HEIGHT,
  )}px`;
}

async function scrollToBottom() {
  await nextTick();

  const list =
    messageListRef.value;

  if (!list) {
    return;
  }

  list.scrollTo({
    top: list.scrollHeight,
    behavior: "smooth",
  });
}

function restoreDraft() {
  message.value =
    pendingDraft.value;

  pendingDraft.value = "";

  nextTick(() => {
    adjustHeight();
    textareaRef.value?.focus();
  });
}

async function abortCreation() {
  abortedRef.value = true;

  await abortAgentCreation();

  restoreDraft();
}

async function sendMessage() {
  const userMessage =
    message.value.trim();

  if (
    !userMessage ||
    !canSend.value
  ) {
    return;
  }

  requestError.value = "";
  abortedRef.value = false;

  pendingDraft.value =
    userMessage;

  message.value = "";

  await nextTick();

  adjustHeight();

  await scrollToBottom();

  try {
    await sendAgentMessage(
      userMessage,
    );

    pendingDraft.value = "";

    if (threadId.value) {
      await navigateTo(
        `/${username}/agent/${threadId.value}`,
      );
    }
  } catch (error) {
    if (abortedRef.value) {
      return;
    }

    if (
      error instanceof DOMException &&
      error.name ===
        "AbortError"
    ) {
      return;
    }

    restoreDraft();
  } finally {
    await scrollToBottom();
  }
}

function handleKeyDown(
  event: KeyboardEvent,
) {
  if (
    event.key === "Enter" &&
    !event.shiftKey
  ) {
    event.preventDefault();

    if (canSend.value) {
      sendMessage();
    }
  }
}

function openFilePicker() {
  if (
    isUploadingFiles.value ||
    isDecliningUserAction.value
  ) {
    return;
  }

  fileInputRef.value?.click();
}

function getFileKey(
  file: File,
) {
  return [
    file.name,
    file.size,
    file.lastModified,
  ].join(":");
}

function createPendingFile(
  file: File,
): PendingFile {
  const isPreviewable =
    file.type.startsWith(
      "image/",
    ) ||
    file.type ===
      "application/pdf";

  return {
    file,
    previewUrl:
      isPreviewable
        ? URL.createObjectURL(
            file,
          )
        : null,
  };
}

function handleFiles(
  event: Event,
) {
  const input =
    event.target as HTMLInputElement;

  if (!input.files?.length) {
    return;
  }

  const existingKeys =
    new Set(
      pendingFiles.value.map(
        ({ file }) =>
          getFileKey(file),
      ),
    );

  const remainingSlots =
    MAX_FILES -
    pendingFiles.value.length;

  if (remainingSlots <= 0) {
    input.value = "";
    return;
  }

  for (const file of Array.from(
    input.files,
  ).slice(
    0,
    remainingSlots,
  )) {
    const key =
      getFileKey(file);

    if (
      existingKeys.has(key)
    ) {
      continue;
    }

    pendingFiles.value.push(
      createPendingFile(file),
    );

    existingKeys.add(key);
  }

  input.value = "";
}

function removePendingFile(
  index: number,
) {
  const item =
    pendingFiles.value[index];

  if (!item) {
    return;
  }

  if (item.previewUrl) {
    URL.revokeObjectURL(
      item.previewUrl,
    );
  }

  pendingFiles.value =
    pendingFiles.value.filter(
      (_, fileIndex) =>
        fileIndex !== index,
    );
}

function clearPendingFiles() {
  for (const item of
    pendingFiles.value) {
    if (item.previewUrl) {
      URL.revokeObjectURL(
        item.previewUrl,
      );
    }
  }

  pendingFiles.value = [];
}

function fileStackStyle(
  index: number,
) {
  const rotations = [
    5,
    -7,
    7,
    -5,
  ];

  const count =
    displayedFiles.value.length;

  const center =
    (count - 1) / 2;

  const gap = 22;

  const translateX =
    (index - center) * gap;

  return {
    transform: `translate(-50%, -50%) translateX(${translateX}px) rotate(${rotations[index % rotations.length]}deg)`,
    zIndex: 10 + index,
  };
}

async function sendPendingFiles() {
  const action =
    pendingUserAction.value;

  if (
    !action ||
    action.type !==
      "upload_file" ||
    !pendingFiles.value
      .length ||
    isUploadingFiles.value ||
    isDecliningUserAction.value
  ) {
    return;
  }

  requestError.value = "";

  try {
    await resolveUserAction(
      action.id,
      undefined,
      pendingFiles.value.map(
        ({ file }) => file,
      ),
    );

    clearPendingFiles();
  } catch (error) {
    requestError.value =
      error instanceof Error
        ? error.message
        : "The documents could not be uploaded.";
  }
}

async function declineUploadRequest() {
  const action =
    pendingUserAction.value;

  if (
    !action ||
    action.type !==
      "upload_file" ||
    isUploadingFiles.value ||
    isDecliningUserAction.value
  ) {
    return;
  }

  requestError.value = "";

  try {
    await declineUserAction(
      action.id,
    );

    clearPendingFiles();
  } catch (error) {
    requestError.value =
      error instanceof Error
        ? error.message
        : "Witness could not continue right now.";
  }
}

watch(
  message,
  () => {
    nextTick(adjustHeight);
  },
);

watch(
  messages,
  () => {
    nextTick(scrollToBottom);
  },
  {
    deep: true,
  },
);

onMounted(() => {
  adjustHeight();
});

onUnmounted(() => {
  clearPendingFiles();
});
</script>

<template>
  <div
    class="flex h-full min-h-0 w-full flex-col"
  >
    <!-- Messages -->
    <div
      v-if="
        hasStarted ||
        requestError
      "
      ref="messageListRef"
      class="noscrollbar min-h-0 flex-1 overflow-y-auto px-1 py-1"
      aria-live="polite"
    >
      <div
        class="mx-auto w-full max-w-185 px-1"
      >
        <GSAPTransition
          group
          :stagger="0.06"
          :hidden="{
            opacity: 0,
            y: 10,
          }"
          :duration="0.3"
        >
          <div
            v-for="(
              chatMessage,
              idx
            ) in messages"
            :key="
              chatMessage.id
            "
            :data-index="idx"
            :class="[
              'flex w-full',
              chatMessage.role === 'user'
                ? 'justify-end'
                : 'justify-start',
              idx > 0
                ? 'mt-4'
                : '',
            ]"
          >
            <UIElementsUserMessageBubble
              v-if="
                chatMessage.role ===
                'user'
              "
              :content="
                chatMessage.content
              "
            />

            <Markdown
              v-else
              :streaming="
                isGenerating
              "
              :options="{
                autoUnwrap: true,
                autoClose: true,
              }"
              class="unmodified-font-sans assistant-markdown font-normal"
            >
              {{
                chatMessage.content
              }}
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

    <!-- Dock -->
    <div
      :class="[
        'w-full shrink-0',
        hasStarted
          ? 'pb-2 pt-4'
          : 'my-auto flex flex-col',
      ]"
    >
      <div
        class="mx-auto w-full max-w-185 px-1"
      >
        <!-- Hero -->
        <GSAPTransition
          :hidden="{
            opacity: 0,
            y: -10,
          }"
          :duration="0.3"
        >
          <div
            v-if="showHero"
            class="mb-[22px] text-center"
          >
            <h1
              class="unmodified-font-sans m-0 mb-2 text-[26px] font-medium tracking-[-0.02em] text-[#121212]"
            >
              {{
                props.displayName
              }}
              what went wrong?
            </h1>
          </div>
        </GSAPTransition>

        <div class="relative w-full">
          <GSAPTransition
            :hidden="{
              opacity: 0,
              y: 12,
              scale: 0.97,
            }"
            :duration="0.35"
          >
            <!-- ================================================== -->
            <!-- UPLOAD INTERRUPTION -->
            <!-- ================================================== -->

            <div
              v-if="
                showUploadInterruption
              "
              key="upload-interruption"
              class="flex w-full items-center justify-center gap-x-2"
              role="group"
              aria-label="Upload requested"
            >
              <!-- Plus -->
              <SmoothCorners
                as-child
                :corners="{
                  radius: 999,
                  smoothing: 0.7,
                }"
                :middle-border="{
                  width: 1,
                  color: '#DDE3FF',
                  opacity: 1,
                }"
              >
                <button
                  v-gsap.whileHover.to="{
                    scale: 1.08,
                  }"
                  v-gsap.whileTap.to="{
                    scale: 0.94,
                  }"
                  type="button"
                  aria-label="Add documents"
                  :disabled="
                    isUploadingFiles ||
                    isDecliningUserAction
                  "
                  class="flex h-9 w-9 shrink-0 items-center justify-center bg-[#EEF2FF] text-[#4F46E5] transition-opacity duration-150 hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
                  @click="
                    openFilePicker
                  "
                >
                  <Plus
                    :size="17"
                    :stroke-width="2"
                  />
                </button>
              </SmoothCorners>

              <input
                ref="fileInputRef"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx,image/*"
                class="hidden"
                @change="handleFiles"
              />

              <!-- Upload pill -->
              <SmoothCorners
                as-child
                :corners="{
                  radius: 999,
                  smoothing: 0.65,
                }"
                :middle-border="{
                  width: 1,
                  color: '#E3E3E3',
                  opacity: 1,
                }"
              >
                <div
                  class="flex h-14 w-[280px] max-w-full items-center justify-center overflow-visible bg-white px-4"
                >
                  <!-- Empty -->
                  <GSAPTransition
                    v-if="
                      !pendingFiles.length &&
                      !isUploadingFiles
                    "
                    :hidden="{
                      opacity: 0,
                      y: 6,
                    }"
                    :duration="0.25"
                  >
                    <span
                      class="unmodified-font-sans text-sm font-medium text-[#6B6B6B]"
                    >
                      Upload your documents
                    </span>
                  </GSAPTransition>

                  <!-- Uploading -->
                  <GSAPTransition
                    v-else-if="
                      isUploadingFiles
                    "
                    :hidden="{
                      opacity: 0,
                      scale: 0.85,
                    }"
                    :duration="0.25"
                  >
                    <Loader
                      :size="18"
                      :stroke-width="1.8"
                      class="animate-spin text-[#6B6B6B]"
                      color="#121212"
                    />
                  </GSAPTransition>

                  <!-- Selected -->
                  <GSAPTransition
                    v-else
                    :hidden="{
                      opacity: 0,
                      scale: 0.9,
                    }"
                    :duration="0.3"
                  >
                    <div
                      class="relative flex h-14 w-full items-center justify-center"
                    >
                      <GSAPTransition
                        group
                        :stagger="0.04"
                        :hidden="{
                          opacity: 0,
                          scale: 0.8,
                        }"
                        :duration="0.28"
                      >
                        <div
                          v-for="(
                            item,
                            index
                          ) in displayedFiles"
                          :key="
                            getFileKey(
                              item.file,
                            )
                          "
                          class="absolute left-1/2 top-1/2 h-12 w-12 cursor-pointer transition-[filter] duration-150 hover:brightness-[0.94]"
                          :style="
                            fileStackStyle(
                              index,
                            )
                          "
                          :title="`Remove ${item.file.name}`"
                          @click="
                            removePendingFile(
                              index,
                            )
                          "
                        >
                          <SmoothCorners
                            as-child
                            :corners="{
                              radius: 10,
                              smoothing: 0.65,
                            }"
                            :middle-border="{
                              width: 1,
                              color: '#E3E3E3',
                              opacity: 1,
                            }"
                          >
                            <div
                              class="relative h-12 w-12 overflow-hidden bg-white shadow-[0_3px_10px_rgba(0,0,0,0.08)]"
                            >
                              <!-- Image -->
                              <img
                                v-if="
                                  item.previewUrl &&
                                  item.file.type.startsWith(
                                    'image/',
                                  )
                                "
                                :src="
                                  item.previewUrl
                                "
                                :alt="
                                  item.file.name
                                "
                                draggable="false"
                                class="h-full w-full object-cover"
                              />

                              <!-- PDF -->
                              <iframe
                                v-else-if="
                                  item.previewUrl &&
                                  item.file.type ===
                                    'application/pdf'
                                "
                                :src="`${item.previewUrl}#page=1&toolbar=0&navpanes=0&scrollbar=0`"
                                :title="
                                  item.file.name
                                "
                                class="pointer-events-none h-full w-full border-0"
                              />

                              <!-- Other document -->
                              <div
                                v-else
                                class="flex h-full w-full items-center justify-center bg-[#F7F7F7]"
                              >
                                <FileText
                                  :size="20"
                                  :stroke-width="1.7"
                                  class="text-[#6B6B6B]"
                                />
                              </div>
                            </div>
                          </SmoothCorners>
                        </div>
                      </GSAPTransition>
                    </div>
                  </GSAPTransition>
                </div>
              </SmoothCorners>

              <!-- Right control -->
              <SmoothCorners
                as-child
                :corners="{
                  radius: 999,
                  smoothing: 0.7,
                }"
              >
                <button
                  v-gsap.whileHover.to="{
                    scale: 1.08,
                  }"
                  v-gsap.whileTap.to="{
                    scale: 0.94,
                  }"
                  type="button"
                  :disabled="
                    isUploadingFiles ||
                    isDecliningUserAction
                  "
                  :aria-label="
                    isUploadingFiles
                      ? 'Uploading documents'
                      : isDecliningUserAction
                        ? 'Continuing without documents'
                        : pendingFiles.length
                          ? 'Send documents'
                          : 'Continue without documents'
                  "
                  class="flex h-9 w-9 shrink-0 items-center justify-center bg-[#121212] text-white transition-opacity duration-150 hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-60"
                  @click="
                    pendingFiles.length
                      ? sendPendingFiles()
                      : declineUploadRequest()
                  "
                >
                  <X
                    v-if="
                      isUploadingFiles ||
                      isDecliningUserAction
                    "
                    :size="15"
                    :stroke-width="2.1"
                  />

                  <ArrowUp
                    v-else-if="
                      pendingFiles.length
                    "
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

            <!-- ================================================== -->
            <!-- NORMAL CHAT -->
            <!-- ================================================== -->

            <div
              v-else-if="!isCreating"
              key="chat-input"
              class="relative w-full"
            >
              <SmoothCorners
                as-child
                :corners="{
                  radius: 24,
                  smoothing: 0.6,
                }"
                :middle-border="{
                  width: 1,
                  color: '#E3E3E3',
                  opacity: 1,
                }"
              >
                <div
                  class="flex flex-col gap-y-1 bg-white p-2"
                >
                  <textarea
                    ref="textareaRef"
                    v-model="message"
                    autofocus
                    rows="1"
                    :placeholder="
                      props.placeholder ??
                      'Tell witness what happened'
                    "
                    aria-label="Describe your issue"
                    class="unmodified-font-sans max-h-50 resize-none overflow-y-auto bg-transparent px-2 pb-1 pt-1.5 text-md font-medium text-[#121212] outline-none placeholder:text-[#8A8A8A]"
                    @keydown="
                      handleKeyDown
                    "
                  />

                  <div
                    class="flex w-full items-center justify-between"
                  >
                    <!-- Attach -->
                    <SmoothCorners
                      as-child
                      :corners="{
                        radius: 999,
                        smoothing: 0.7,
                      }"
                      :middle-border="{
                        width: 1,
                        color: '#E3E3E3',
                        opacity: 1,
                      }"
                    >
                      <button
                        v-gsap.whileHover.to="{
                          scale: 1.08,
                        }"
                        v-gsap.whileTap.to="{
                          scale: 0.94,
                        }"
                        type="button"
                        aria-label="Add files"
                        class="flex h-8 w-8 items-center justify-center bg-white text-[#6B6B6B] transition-colors duration-150 hover:bg-[#F4F4F4] hover:text-[#121212]"
                        @click="
                          openFilePicker
                        "
                      >
                        <Plus
                          :size="17"
                          :stroke-width="1.8"
                        />
                      </button>
                    </SmoothCorners>

                    <SmoothCorners
                      as-child
                      :corners="{
                        radius: 999,
                        smoothing: 0.7,
                      }"
                    >
                      <button
                        v-gsap.whileHover.to="{
                          scale: 1.08,
                        }"
                        v-gsap.whileTap.to="{
                          scale: 0.94,
                        }"
                        type="button"
                        aria-label="Send message"
                        :disabled="
                          !canSend
                        "
                        class="flex h-8 w-8 items-center justify-center bg-[#121212] text-white transition-opacity duration-150 disabled:cursor-not-allowed disabled:opacity-30"
                        @click="
                          sendMessage
                        "
                      >
                        <ArrowUp
                          :size="15"
                          :stroke-width="2.2"
                        />
                      </button>
                    </SmoothCorners>
                  </div>
                </div>
              </SmoothCorners>
            </div>

            <!-- ================================================== -->
            <!-- WORKING -->
            <!-- ================================================== -->

            <div
              v-else
              key="creating-pill"
              class="flex w-full items-center justify-center gap-x-2"
              role="status"
              aria-label="Witness is working"
            >
              <SmoothCorners
                as-child
                :corners="{
                  radius: 999,
                  smoothing: 0.6,
                }"
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
                    :hidden="{
                      opacity: 0,
                      y: 6,
                    }"
                    :duration="0.25"
                  >
                    <span
                      :key="
                        currentStepText
                      "
                      class="loading-shimmer unmodified-font-sans truncate text-sm font-medium"
                      aria-live="polite"
                    >
                      {{
                        currentStepText
                      }}
                    </span>
                  </GSAPTransition>
                </div>
              </SmoothCorners>

              <SmoothCorners
                as-child
                :corners="{
                  radius: 999,
                  smoothing: 0.7,
                }"
              >
                <button
                  v-gsap.whileHover.to="{
                    scale: 1.08,
                  }"
                  v-gsap.whileTap.to="{
                    scale: 0.94,
                  }"
                  type="button"
                  aria-label="Stop Witness"
                  class="flex h-8 w-8 shrink-0 items-center justify-center bg-[#121212] text-white transition-opacity duration-150 hover:opacity-85"
                  @click="
                    abortCreation
                  "
                >
                  <X
                    :size="14"
                    :stroke-width="2"
                  />
                </button>
              </SmoothCorners>
            </div>
          </GSAPTransition>
        </div>
      </div>
    </div>
  </div>
</template>