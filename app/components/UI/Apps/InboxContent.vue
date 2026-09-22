<script setup lang="ts">
import type { Id } from "@@/convex/_generated/dataModel";
import {
  ArrowUpRight,
  Bell,
  Check,
  Edit3,
  Mail,
  Send,
  Sparkles,
  X,
} from "@lucide/vue";
import { SmoothCorners } from "@lisse/vue";
import { api } from "@@/convex/_generated/api";

type DraftStatus =
  | "drafting"
  | "ready"
  | "error"
  | "sent"
  | "dismissed";

type InboxItem = {
  _id: Id<"inboxItems">;
  caseId?: Id<"cases">;
  agentId?: Id<"agents">;

  types:
    | "email"
    | "alert"
    | "notification"
    | "agent_update"
    | "case_update";

  title: string;
  preview: string;
  content: string;

  sender?: string;
  subject?: string;
  source?: string;
  externalId?: string;

  draftStatus?: DraftStatus;
  draftText?: string;

  updatedAt: number;
};

const props =
  defineProps<{
    item: InboxItem | null;
  }>();

const route = useRoute();
const router = useRouter();
const convex = useConvexClient();

const draftText = ref("");
const replyText = ref("");

const replyMode =
  ref<"agent" | "myself" | null>(null);

const editingDraft = ref(false);
const drafting = ref(false);
const sending = ref(false);
const replyError = ref("");

const username = computed(() =>
  String(route.params.username),
);

const isEmail = computed(
  () => props.item?.types === "email",
);

const isAgentMail = computed(
  () =>
    props.item?.source ===
      "agentmail" &&
    !!props.item?.externalId,
);

const canReply = computed(
  () =>
    isEmail.value &&
    isAgentMail.value,
);

const hasDraft = computed(
  () =>
    props.item?.draftStatus ===
      "ready" &&
    !!(
      draftText.value ||
      props.item?.draftText
    ),
);

const draftIsLoading = computed(
  () =>
    props.item?.draftStatus ===
      "drafting" ||
    drafting.value,
);

watch(
  () => props.item,
  item => {
    replyError.value = "";
    replyMode.value = null;
    editingDraft.value = false;
    replyText.value = "";

    if (
      item?.draftStatus === "ready"
    ) {
      draftText.value =
        item.draftText ?? "";
      return;
    }

    if (
      item?.draftStatus ===
      "dismissed"
    ) {
      draftText.value = "";
      return;
    }

    if (
      item?.draftStatus === "error"
    ) {
      draftText.value = "";
      return;
    }

    draftText.value = "";
  },
  {
    immediate: true,
  },
);

const formatDate = (
  timestamp: number,
) =>
  new Date(timestamp).toLocaleString(
    [],
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  );

function openCase() {
  if (!props.item?.caseId) {
    return;
  }

  router.push(
    `/${username.value}/cases/${props.item.caseId}`,
  );
}

async function createDraft() {
  if (
    !props.item ||
    !canReply.value ||
    drafting.value
  ) {
    return;
  }

  drafting.value = true;
  replyError.value = "";

  try {
    const result =
      await convex.action(
        api.agentmails.actions
          .prepareWitnessReply,
        {
          inboxItemId:
            props.item._id,
        },
      );

    draftText.value =
      result.draft;

    replyMode.value =
      "agent";

    editingDraft.value =
      true;
  } catch (error) {
    console.error(
      "Failed to prepare Witness reply:",
      error,
    );

    replyError.value =
      error instanceof Error
        ? error.message
        : "Witness could not prepare a reply.";
  } finally {
    drafting.value = false;
  }
}

function startManualReply() {
  replyMode.value =
    "myself";

  replyText.value = "";
  replyError.value = "";
}

function editDraft() {
  replyMode.value =
    "agent";

  editingDraft.value =
    true;
}

function cancelReply() {
  if (sending.value) {
    return;
  }

  replyMode.value =
    null;

  editingDraft.value =
    false;

  replyText.value = "";
  replyError.value = "";
}

async function dismissDraft() {
  if (!props.item) {
    return;
  }

  try {
    await convex.mutation(
      api.agentmail.dismissReplyDraft,
      {
        inboxItemId:
          props.item._id,
      },
    );

    draftText.value = "";
    editingDraft.value =
      false;
    replyMode.value = null;
  } catch (error) {
    console.error(
      "Failed to dismiss draft:",
      error,
    );
  }
}

async function sendReply() {
  if (
    !props.item ||
    sending.value
  ) {
    return;
  }

  const text =
    replyMode.value === "agent"
      ? draftText.value.trim()
      : replyText.value.trim();

  if (!text) {
    return;
  }

  sending.value = true;
  replyError.value = "";

  try {
    if (
      replyMode.value ===
      "agent"
    ) {
      await convex.action(
        api.agentmails.actions
          .sendWitnessReply,
        {
          inboxItemId:
            props.item._id,
          text,
        },
      );
    } else {
      await convex.action(
        api.agentmails.actions
          .replyToEmail,
        {
          inboxItemId:
            props.item._id,
          text,
        },
      );
    }

    draftText.value = "";
    replyText.value = "";
    replyMode.value = null;
    editingDraft.value =
      false;
  } catch (error) {
    console.error(
      "Failed to send reply:",
      error,
    );

    replyError.value =
      error instanceof Error
        ? error.message
        : "Failed to send reply.";
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <main
    class="relative flex min-w-0 flex-1 flex-col"
  >
    <template v-if="item">
      <!-- HEADER -->
      <header
        class="shrink-0 border-b border-black/[0.06] px-10 py-7"
      >
        <div
          class="flex items-center gap-2 text-[11px] text-black/35"
        >
          <Mail
            v-if="item.types === 'email'"
            :size="14"
            :stroke-width="1.7"
          />

          <Bell
            v-else
            :size="14"
            :stroke-width="1.7"
          />

          <span class="capitalize">
            {{
              item.types.replace(
                "_",
                " ",
              )
            }}
          </span>

          <span>·</span>

          <span>
            {{ formatDate(item.updatedAt) }}
          </span>
        </div>

        <div
          class="mt-4 flex items-start justify-between gap-6"
        >
          <div class="min-w-0">
            <h2
              class="max-w-4xl text-[24px] font-medium tracking-[-0.03em] text-black"
            >
              {{
                item.subject ||
                item.title
              }}
            </h2>

            <div
              v-if="item.sender"
              class="mt-3 flex items-center gap-2 text-[12px] text-black/45"
            >
              <span
                class="font-medium text-black/70"
              >
                {{ item.sender }}
              </span>

              <span>·</span>

              <span>
                {{
                  item.source ||
                  "Witness"
                }}
              </span>
            </div>
          </div>

          <button
            v-if="item.caseId"
            type="button"
            class="group mt-1 inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-black/40 transition hover:text-black"
            @click="openCase"
          >
            Open Case

            <ArrowUpRight
              :size="13"
              :stroke-width="1.7"
              class="transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </button>
        </div>
      </header>

      <!-- MESSAGE -->
      <div
        class="min-h-0 flex-1 overflow-y-auto"
      >
        <article
          class="mx-auto w-full max-w-3xl px-10 py-10 pb-52"
        >
          <div
            class="whitespace-pre-wrap text-[14px] leading-7 text-black/70"
          >
            {{ item.content }}
          </div>
        </article>
      </div>

      <!-- REPLY DOCK -->
      <div
        v-if="canReply"
        class="absolute inset-x-0 bottom-0 px-6 pb-6"
      >
        <SmoothCorners
          as-child
          :corners="{
            radius: 15,
            smoothing: 0.7,
          }"
          :middle-border="{
            width: 1,
            color: '#E4E4E4',
            opacity: 1,
          }"
        >
          <section
            class="mx-auto w-full max-w-3xl bg-white shadow-[0_12px_40px_rgba(0,0,0,0.09)]"
          >
            <!-- DRAFT READY -->
            <div
              v-if="
                hasDraft &&
                !editingDraft &&
                !replyMode
              "
              class="p-4"
            >
              <div
                class="flex items-center justify-between"
              >
                <div
                  class="flex items-center gap-2"
                >
                  <SmoothCorners
                    as-child
                    :corners="{
                      radius: 8,
                      smoothing: 0.65,
                    }"
                  >
                    <div
                      class="flex h-7 w-7 items-center justify-center bg-black"
                    >
                      <Sparkles
                        :size="13"
                        :stroke-width="1.8"
                        class="text-white"
                      />
                    </div>
                  </SmoothCorners>

                  <div>
                    <p
                      class="text-[12px] font-medium text-black"
                    >
                      Witness drafted a reply
                    </p>

                    <p
                      class="mt-0.5 text-[10px] text-black/35"
                    >
                      Review it before it is sent.
                    </p>
                  </div>
                </div>

                <span
                  class="flex items-center gap-1 text-[10px] text-black/35"
                >
                  <Check
                    :size="11"
                    :stroke-width="2"
                  />
                  Ready
                </span>
              </div>

              <div
                class="mt-3 rounded-[10px] bg-[#F7F7F7] px-3.5 py-3"
              >
                <p
                  class="whitespace-pre-wrap text-[12px] leading-6 text-black/65"
                >
                  {{ draftText }}
                </p>
              </div>

              <div
                class="mt-3 flex items-center justify-between"
              >
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 text-[11px] text-black/38 transition hover:text-black"
                  @click="dismissDraft"
                >
                  <X
                    :size="13"
                    :stroke-width="1.8"
                  />
                  Dismiss
                </button>

                <div
                  class="flex items-center gap-2"
                >
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-medium text-black/50 transition hover:bg-black/[0.04] hover:text-black"
                    @click="editDraft"
                  >
                    <Edit3
                      :size="13"
                      :stroke-width="1.8"
                    />
                    Edit
                  </button>

                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-[11px] font-medium text-white transition hover:bg-black/85 disabled:opacity-40"
                    :disabled="sending"
                    @click="replyMode = 'agent'; sendReply()"
                  >
                    <Send
                      :size="13"
                      :stroke-width="1.8"
                    />

                    {{
                      sending
                        ? "Sending…"
                        : "Approve & send"
                    }}
                  </button>
                </div>
              </div>
            </div>

            <!-- DRAFTING -->
            <div
              v-else-if="draftIsLoading"
              class="flex items-center gap-3 px-4 py-4"
            >
              <div
                class="flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.05]"
              >
                <Sparkles
                  :size="14"
                  :stroke-width="1.7"
                  class="text-black/40"
                />
              </div>

              <div>
                <p
                  class="text-[12px] font-medium text-black/65"
                >
                  Witness is drafting a reply…
                </p>

                <p
                  class="mt-0.5 text-[10px] text-black/30"
                >
                  You will review it before anything is sent.
                </p>
              </div>
            </div>

            <!-- EDIT / MANUAL REPLY -->
            <div
              v-else-if="
                replyMode === 'agent' ||
                replyMode === 'myself'
              "
              class="p-3"
            >
              <div
                class="flex items-center justify-between px-2 pb-2"
              >
                <div
                  class="flex items-center gap-2"
                >
                  <Sparkles
                    v-if="
                      replyMode ===
                      'agent'
                    "
                    :size="13"
                    :stroke-width="1.8"
                    class="text-black/40"
                  />

                  <Mail
                    v-else
                    :size="13"
                    :stroke-width="1.8"
                    class="text-black/40"
                  />

                  <span
                    class="text-[12px] font-medium text-black/70"
                  >
                    {{
                      replyMode ===
                      "agent"
                        ? "Edit Witness reply"
                        : "Write your reply"
                    }}
                  </span>
                </div>

                <button
                  type="button"
                  class="flex h-7 w-7 items-center justify-center rounded-full text-black/30 transition hover:bg-black/[0.04] hover:text-black"
                  @click="cancelReply"
                >
                  <X
                    :size="14"
                    :stroke-width="1.8"
                  />
                </button>
              </div>

              <div
                v-if="replyError"
                class="mx-2 mb-2 rounded-[8px] bg-red-50 px-3 py-2 text-[11px] text-red-600"
              >
                {{ replyError }}
              </div>

              <textarea
                v-if="
                  replyMode ===
                  'myself'
                "
                v-model="replyText"
                rows="5"
                autofocus
                class="w-full resize-none rounded-[10px] bg-[#F7F7F7] px-3.5 py-3 text-[12px] leading-6 text-black outline-none placeholder:text-black/25"
                placeholder="Write your reply…"
              />

              <textarea
                v-else
                v-model="draftText"
                rows="5"
                autofocus
                class="w-full resize-none rounded-[10px] bg-[#F7F7F7] px-3.5 py-3 text-[12px] leading-6 text-black outline-none"
              />

              <div
                class="flex items-center justify-between px-2 pt-2"
              >
                <span
                  class="text-[10px] text-black/25"
                >
                  {{
                    replyMode ===
                    "agent"
                      ? "Witness draft · edit freely before approving"
                      : "Your reply"
                  }}
                </span>

                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-[11px] font-medium text-white transition hover:bg-black/85 disabled:opacity-40"
                  :disabled="
                    sending ||
                    (
                      replyMode ===
                        'agent'
                        ? !draftText.trim()
                        : !replyText.trim()
                    )
                  "
                  @click="sendReply"
                >
                  <Send
                    v-if="!sending"
                    :size="13"
                    :stroke-width="1.8"
                  />

                  <span>
                    {{
                      sending
                        ? "Sending…"
                        : replyMode ===
                            "agent"
                          ? "Approve & send"
                          : "Send reply"
                    }}
                  </span>
                </button>
              </div>
            </div>

            <!-- NO DRAFT -->
            <div
              v-else
              class="flex items-center justify-between gap-4 px-4 py-3.5"
            >
              <div
                class="flex items-center gap-2.5"
              >
                <div
                  class="flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.05]"
                >
                  <Mail
                    :size="14"
                    :stroke-width="1.7"
                    class="text-black/35"
                  />
                </div>

                <div>
                  <p
                    class="text-[12px] font-medium text-black/65"
                  >
                    Reply to this email
                  </p>

                  <p
                    class="mt-0.5 text-[10px] text-black/30"
                  >
                    Witness can draft one for your review.
                  </p>
                </div>
              </div>

              <div
                class="flex items-center gap-2"
              >
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] text-black/45 transition hover:bg-black/[0.04] hover:text-black"
                  @click="startManualReply"
                >
                  Write myself
                </button>

                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-[11px] font-medium text-white transition hover:bg-black/85 disabled:opacity-40"
                  :disabled="drafting"
                  @click="createDraft"
                >
                  <Sparkles
                    :size="13"
                    :stroke-width="1.8"
                  />

                  {{
                    drafting
                      ? "Drafting…"
                      : "Draft with Witness"
                  }}
                </button>
              </div>
            </div>
          </section>
        </SmoothCorners>
      </div>
    </template>

    <!-- EMPTY -->
    <div
      v-else
      class="flex h-full items-center justify-center"
    >
      <div
        class="max-w-xs text-center"
      >
        <div
          class="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/[0.04]"
        >
          <Mail
            :size="18"
            :stroke-width="1.7"
            class="text-black/30"
          />
        </div>

        <p
          class="text-[13px] font-medium text-black/60"
        >
          Nothing selected
        </p>

        <p
          class="mt-1 text-[11px] leading-5 text-black/35"
        >
          Select an item from your Inbox to see what's happening.
        </p>
      </div>
    </div>
  </main>
</template>