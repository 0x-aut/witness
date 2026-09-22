<script setup lang="ts">
import type { Id } from "@@/convex/_generated/dataModel";
import {
  ArrowUpRight,
  Bell,
  ExternalLink,
  Mail,
  Send,
  Sparkles,
  X,
} from "@lucide/vue";
import { api } from "@@/convex/_generated/api";

type InboxItem = {
  _id: Id<"inboxItems">;
  caseId?: Id<"cases">;
  agentId?: Id<"agents">;
  types: "email" | "alert" | "notification" | "agent_update" | "case_update";
  title: string;
  preview: string;
  content: string;
  sender?: string;
  subject?: string;
  source?: string;
  externalId?: string;
  updatedAt: number;
};

const props = defineProps<{
  item: InboxItem | null;
}>();

const route = useRoute();
const router = useRouter();
const convex = useConvexClient();

const replying = ref(false);
const drafting = ref(false);
const sending = ref(false);
const replyText = ref("");
const replyError = ref("");
const replyMode = ref<"agent" | "myself">("myself");

const username = computed(() => String(route.params.username));

const isEmail = computed(
  () => props.item?.types === "email",
);

const canReply = computed(
  () =>
    isEmail.value &&
    props.item?.source === "agentmail" &&
    !!props.item?.externalId,
);

async function openReply(mode: "agent" | "myself") {
  replyMode.value = mode;
  replying.value = true;
  replyError.value = "";
  replyText.value = "";

  if (mode !== "agent" || !props.item) {
    return;
  }

  drafting.value = true;

  try {
    const result = await convex.action(
      api.agentmails.actions.prepareWitnessReply,
      {
        inboxItemId: props.item._id,
      },
    );

    replyText.value = result.draft;
  } catch (error) {
    console.error("Failed to prepare Witness reply:", error);
    replyError.value =
      error instanceof Error
        ? error.message
        : "Witness could not prepare a reply.";
  } finally {
    drafting.value = false;
  }
}

function closeReply() {
  if (sending.value) return;

  replying.value = false;
  drafting.value = false;
  replyText.value = "";
  replyError.value = "";
}

async function sendReply() {
  if (!props.item || !replyText.value.trim() || sending.value || drafting.value) {
    return;
  }

  sending.value = true;
  replyError.value = "";

  try {
    if (replyMode.value === "agent") {
      await convex.action(
        api.agentmails.actions.sendWitnessReply,
        {
          inboxItemId: props.item._id,
          text: replyText.value.trim(),
        },
      );
    } else {
      await convex.action(
        api.agentmails.actions.replyToEmail,
        {
          inboxItemId: props.item._id,
          text: replyText.value.trim(),
        },
      );
    }

    replyText.value = "";
    replying.value = false;
  } catch (error) {
    console.error("Failed to send reply:", error);
    replyError.value =
      error instanceof Error
        ? error.message
        : "Failed to send reply.";
  } finally {
    sending.value = false;
  }
}

function openCase() {
  if (!props.item?.caseId) return;

  router.push(
    `/${username.value}/cases/${props.item.caseId}`,
  );
}

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
</script>

<template>
  <main class="relative flex min-w-0 flex-1 flex-col">
    <template v-if="item">
      <header class="shrink-0 border-b border-black/6 px-10 py-8">
        <div class="flex items-center gap-2 text-[11px] text-black/35">
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
            {{ item.types.replace("_", " ") }}
          </span>

          <span>·</span>

          <span>
            {{ formatDate(item.updatedAt) }}
          </span>
        </div>

        <h2 class="mt-4 max-w-4xl text-[24px] font-medium tracking-[-0.03em] text-black">
          {{ item.subject || item.title }}
        </h2>

        <div
          v-if="item.sender"
          class="mt-4 flex items-center gap-2 text-[12px] text-black/45"
        >
          <span class="font-medium text-black/70">
            {{ item.sender }}
          </span>

          <span>·</span>

          <span>
            {{ item.source || "Witness" }}
          </span>
        </div>

        <button
          v-if="item.caseId"
          type="button"
          class="group mt-5 inline-flex items-center gap-1.5 text-[11px] font-medium text-black/40 transition hover:text-black"
          @click="openCase"
        >
          Open Case

          <ArrowUpRight
            :size="13"
            :stroke-width="1.7"
            class="transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </button>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto">
        <article class="mx-auto w-full max-w-3xl px-10 py-10 pb-32">
          <div class="whitespace-pre-wrap text-[14px] leading-7 text-black/70">
            {{ item.content }}
          </div>
        </article>
      </div>

      <div
        v-if="canReply && !replying"
        class="absolute inset-x-0 bottom-0 flex justify-center px-6 pb-6"
      >
        <div class="flex items-center gap-2 rounded-full border border-black/8 bg-white/95 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur">
          <button
            type="button"
            class="flex items-center gap-2 rounded-full bg-black px-4 py-2.5 text-[12px] font-medium text-white transition hover:bg-black/85"
            @click="openReply('agent')"
          >
            <Sparkles
              :size="14"
              :stroke-width="1.8"
            />
            Use Witness
          </button>

          <button
            type="button"
            class="flex items-center gap-2 rounded-full px-3.5 py-2.5 text-[12px] text-black/55 transition hover:bg-black/5 hover:text-black"
            @click="openReply('myself')"
          >
            Write myself
          </button>
        </div>
      </div>

      <div
        v-if="replying"
        class="absolute inset-x-0 bottom-0 flex justify-center px-6 pb-6"
      >
        <div class="w-full max-w-2xl rounded-[14px] border border-black/10 bg-white p-3 shadow-[0_14px_40px_rgba(0,0,0,0.12)]">
          <div class="flex items-center justify-between px-2 pb-2">
            <div class="flex items-center gap-2">
              <Sparkles
                v-if="replyMode === 'agent'"
                :size="14"
                :stroke-width="1.8"
                class="text-black/45"
              />

              <span class="text-[12px] font-medium text-black/70">
                {{ replyMode === "agent" ? "Reply with Witness" : "Write your reply" }}
              </span>
            </div>

            <button
              type="button"
              class="flex h-7 w-7 items-center justify-center rounded-full text-black/35 transition hover:bg-black/5 hover:text-black"
              @click="closeReply"
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

          <div
            v-if="drafting"
            class="flex min-h-36 items-center justify-center"
          >
            <Loader />
          </div>

          <textarea
            v-else
            v-model="replyText"
            autofocus
            rows="6"
            class="w-full resize-none border-none bg-transparent px-2 py-2 text-[13px] leading-6 text-black outline-none placeholder:text-black/25"
            :placeholder="
              replyMode === 'agent'
                ? 'Witness will prepare the reply…'
                : 'Write your reply…'
            "
            @keydown.meta.enter="sendReply"
            @keydown.ctrl.enter="sendReply"
          />

          <div class="flex items-center justify-between px-2 pt-2">
            <span class="text-[10px] text-black/25">
              {{
                replyMode === "agent"
                  ? "Witness drafted this reply · edit before sending"
                  : "Your reply"
              }}
            </span>

            <button
              type="button"
              class="flex items-center gap-2 rounded-full bg-black px-4 py-2.5 text-[12px] font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="sending || drafting || !replyText.trim()"
              @click="sendReply"
            >
              <Send
                v-if="!sending"
                :size="13"
                :stroke-width="1.8"
              />

              <Loader v-else />

              <span>
                {{
                  sending
                    ? "Sending…"
                    : replyMode === "agent"
                      ? "Approve & send"
                      : "Send reply"
                }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </template>

    <div
      v-else
      class="flex h-full items-center justify-center"
    >
      <div class="max-w-xs text-center">
        <div class="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/[0.04]">
          <Mail
            :size="18"
            :stroke-width="1.7"
            class="text-black/30"
          />
        </div>

        <p class="text-[13px] font-medium text-black/60">
          Nothing selected
        </p>

        <p class="mt-1 text-[11px] leading-5 text-black/35">
          Select an item from your Inbox to see what's happening.
        </p>
      </div>
    </div>
  </main>
</template>