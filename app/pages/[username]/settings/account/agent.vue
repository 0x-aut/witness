<script setup lang="ts">
import {
  Check,
  LoaderCircle,
  RotateCcw,
  Sparkles,
} from "@lucide/vue";
import { SmoothCorners } from "@lisse/vue";
import { api } from "@@/convex/_generated/api";

definePageMeta({
  layout: "set",
});

useSeoMeta({
  title: "Agent personalization",
});

const convex = useConvexClient();

const content = ref("");
const originalContent = ref("");

const loading = ref(true);
const saving = ref(false);

const saveState = ref<"idle" | "saved" | "error">("idle");
const errorMessage = ref("");

const MAX_LENGTH = 5000;

const dirty = computed(
  () => content.value !== originalContent.value,
);

const characterCount = computed(
  () => content.value.length,
);

const remainingCharacters = computed(
  () => MAX_LENGTH - characterCount.value,
);

async function loadContext() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const result = await convex.query(
      api.profile.getAgentContext,
      {},
    );

    content.value = result ?? "";
    originalContent.value = result ?? "";
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : "Unable to load your agent context.";

    saveState.value = "error";
  } finally {
    loading.value = false;
  }
}

async function saveContext() {
  if (saving.value || !dirty.value) return;

  const value = content.value.trim();

  if (value.length > MAX_LENGTH) {
    saveState.value = "error";
    errorMessage.value =
      "Agent context cannot exceed 5,000 characters.";
    return;
  }

  saving.value = true;
  saveState.value = "idle";
  errorMessage.value = "";

  try {
    await convex.mutation(
      api.profile.saveAgentContext,
      {
        content: value,
      },
    );

    content.value = value;
    originalContent.value = value;

    saveState.value = "saved";

    window.setTimeout(() => {
      if (!saving.value) {
        saveState.value = "idle";
      }
    }, 1800);
  } catch (error) {
    saveState.value = "error";

    errorMessage.value =
      error instanceof Error
        ? error.message
        : "Unable to save your agent context.";
  } finally {
    saving.value = false;
  }
}

function resetContext() {
  content.value = originalContent.value;
  saveState.value = "idle";
  errorMessage.value = "";
}

onMounted(loadContext);
</script>

<template>
  <div class="h-full w-full overflow-y-auto">
    <div
      class="mx-auto flex min-h-full w-full max-w-175 flex-col gap-y-8 px-6 py-12"
    >
      <!-- HEADER -->
      <header>
        <div class="flex items-center gap-x-2">
          <h1
            class="font-sans text-2xl font-medium tracking-[-0.025em] text-[#121212]"
          >
            Agent personalization
          </h1>

          <Sparkles
            :size="17"
            :stroke-width="1.7"
            class="text-[#777777]"
          />
        </div>

        <p
          class="mt-1.5 max-w-130 font-sans text-sm leading-5 text-[#6B6B6B]"
        >
          Give Witness context about you so your Agents can better understand
          your situation and how you want to work.
        </p>
      </header>

      <!-- CONTEXT CARD -->
      <SmoothCorners
        as-child
        :corners="{
          radius: 15,
          smoothing: 0.6,
        }"
        :middleborder="{
          width: 1,
          color: '#E3E3E3',
          opacity: 1,
        }"
      >
        <div
          class="flex w-full flex-col overflow-hidden bg-white"
        >
          <!-- INTRO -->
          <div
            class="flex flex-col gap-y-1 border-b border-[#EEEEEE] px-4 py-4"
          >
            <span
              class="unmodified-font-sans text-sm font-medium text-[#121212]"
            >
              What should your Agent know about you?
            </span>

            <p
              class="max-w-125 font-sans text-xs leading-5 text-[#8A8A8A]"
            >
              Tell Witness things that are useful across conversations and
              Cases — preferences, recurring circumstances, communication
              preferences, or important background.
            </p>
          </div>

          <!-- TEXTAREA -->
          <div class="relative p-3">
            <SmoothCorners
              as-child
              :corners="{
                radius: 11,
                smoothing: 0.6,
              }"
            >
              <div
                class="relative h-72 w-full border border-[#E1E1E1] bg-[#FAFAFA] transition-colors duration-100 focus-within:border-[#C7C7C7] focus-within:bg-white"
              >
                <div
                  v-if="loading"
                  class="absolute inset-0 flex items-center justify-center"
                >
                  <LoaderCircle
                    :size="16"
                    :stroke-width="1.7"
                    class="animate-spin text-[#8A8A8A]"
                  />
                </div>

                <textarea
                  v-else
                  v-model="content"
                  :maxlength="MAX_LENGTH"
                  spellcheck="true"
                  placeholder="For example: I prefer email over phone calls. I live in California. Keep communications concise and avoid unnecessary back-and-forth..."
                  class="h-full w-full resize-none overflow-y-auto bg-transparent px-3.5 py-3 font-sans text-sm leading-6 text-[#222222] outline-none placeholder:text-[#A5A5A5]"
                />

                <div
                  v-if="!loading"
                  class="pointer-events-none absolute bottom-2.5 right-3.5"
                >
                  <span
                    :class="[
                      'font-sans text-[11px]',
                      remainingCharacters < 300
                        ? 'text-[#A36B45]'
                        : 'text-[#A0A0A0]',
                    ]"
                  >
                    {{ characterCount.toLocaleString() }} /
                    {{ MAX_LENGTH.toLocaleString() }}
                  </span>
                </div>
              </div>
            </SmoothCorners>
          </div>

          <!-- FOOTER -->
          <div
            class="flex items-center justify-between gap-x-4 border-t border-[#EEEEEE] bg-[#FCFCFC] px-4 py-3"
          >
            <div class="min-w-0">
              <div
                v-if="errorMessage"
                class="font-sans text-xs text-[#A34D4D]"
              >
                {{ errorMessage }}
              </div>

              <div
                v-else-if="saveState === 'saved'"
                class="flex items-center gap-x-1.5"
              >
                <Check
                  :size="14"
                  :stroke-width="1.8"
                  class="text-[#4B7A58]"
                />

                <span
                  class="font-sans text-xs text-[#5D735F]"
                >
                  Context saved.
                </span>
              </div>

              <span
                v-else-if="dirty"
                class="font-sans text-xs text-[#8A8A8A]"
              >
                You have unsaved changes.
              </span>

              <span
                v-else
                class="font-sans text-xs text-[#9A9A9A]"
              >
                Your Agent will use this context across Cases.
              </span>
            </div>

            <div class="flex shrink-0 items-center gap-x-2">
              <SmoothCorners
                v-if="dirty"
                as-child
                :corners="{
                  radius: 999,
                  smoothing: 0.6,
                }"
              >
                <button
                  type="button"
                  class="flex h-9 items-center gap-x-1.5 px-3 text-[#6A6A6A] transition-colors duration-100 hover:bg-[#EEEEEE] hover:text-[#121212]"
                  @click="resetContext"
                >
                  <RotateCcw
                    :size="13"
                    :stroke-width="1.8"
                  />

                  <span
                    class="unmodified-font-sans text-xs font-medium"
                  >
                    Reset
                  </span>
                </button>
              </SmoothCorners>

              <SmoothCorners
                as-child
                :corners="{
                  radius: 999,
                  smoothing: 0.6,
                }"
              >
                <button
                  type="button"
                  :disabled="
                    !dirty ||
                    saving ||
                    loading ||
                    characterCount > MAX_LENGTH
                  "
                  class="flex h-9 min-w-20 items-center justify-center gap-x-1.5 bg-[#121212] px-3.5 transition-opacity duration-100 disabled:cursor-not-allowed disabled:opacity-30"
                  @click="saveContext"
                >
                  <LoaderCircle
                    v-if="saving"
                    :size="14"
                    :stroke-width="1.8"
                    class="animate-spin text-white"
                  />

                  <Check
                    v-else-if="saveState === 'saved'"
                    :size="14"
                    :stroke-width="1.8"
                    class="text-white"
                  />

                  <span
                    class="unmodified-font-sans text-xs font-medium text-white"
                  >
                    {{
                      saving
                        ? "Saving"
                        : saveState === "saved"
                          ? "Saved"
                          : "Save"
                    }}
                  </span>
                </button>
              </SmoothCorners>
            </div>
          </div>
        </div>
      </SmoothCorners>

      <!-- EXPLANATION -->
      <p
        class="max-w-150 px-1 font-sans text-xs leading-5 text-[#8A8A8A]"
      >
        This context is private to your account and is available to Witness
        Agents when they work on your behalf. It is not attached to a single
        Case, so you only need to provide recurring information once.
      </p>
    </div>
  </div>
</template>