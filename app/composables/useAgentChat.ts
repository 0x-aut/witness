import { computed, ref, watch } from "vue";
import { api } from "@@/convex/_generated/api";

export interface AgentChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface StreamState {
  streamId: string;
  order: number;
  stepOrder: number;
  content: string;
}

interface OptimisticAgentChatMessage extends AgentChatMessage {
  optimisticId: string;
  persistedOrder?: number;
}

export interface SendAgentMessageOptions {
  tools?: string[];
  skills?: string[];
  signal?: AbortSignal;
}

export function useAgentChat() {
  const optimisticMessages =
    ref<OptimisticAgentChatMessage[]>([]);

  const threadId = ref("");

  const requestError = ref("");
  const waitingForResponse = ref(false);
  const toolsUsed = ref<string[]>([]);

  const {
    mutate: sendMessageMutation,
    isPending: isMutationPending,
  } = useConvexMutation(
    api.agents.chat.sendMessage,
  );

  const messageQueryArgs = computed(() => ({
    threadId: threadId.value,

    paginationOpts: {
      cursor: null,
      numItems: 50,
    },

    streamArgs: {
      kind: "list" as const,
      startOrder: 0,
    },
  }));

  const messageQuery = useConvexQuery(
    api.agents.chat.listMessages,
    messageQueryArgs,
  );

  const activeStreams = computed(() => {
    const streams =
      messageQuery.data.value?.streams;

    if (!streams || streams.kind !== "list") {
      return [];
    }

    return streams.messages;
  });

  const cursors = ref<Record<string, number>>({});
  const streamStates =
    ref<Record<string, StreamState>>({});

  watch(threadId, () => {
    cursors.value = {};
    streamStates.value = {};
  });

  watch(
    activeStreams,
    (streams) => {
      const activeIds = new Set(
        streams.map((stream) => stream.streamId),
      );

      const nextStates: Record<string, StreamState> = {};

      for (const stream of streams) {
        const existing =
          streamStates.value[stream.streamId];

        nextStates[stream.streamId] =
          existing ?? {
            streamId: stream.streamId,
            order: stream.order,
            stepOrder: stream.stepOrder,
            content: "",
          };

        nextStates[stream.streamId]!.order =
          stream.order;

        nextStates[stream.streamId]!.stepOrder =
          stream.stepOrder;
      }

      streamStates.value = nextStates;

      const nextCursors: Record<string, number> = {};

      for (const [streamId, cursor] of Object.entries(
        cursors.value,
      )) {
        if (activeIds.has(streamId)) {
          nextCursors[streamId] = cursor;
        }
      }

      cursors.value = nextCursors;
    },
    {
      immediate: true,
      deep: true,
    },
  );

  const deltaQueryArgs = computed(() => ({
    threadId: threadId.value,

    paginationOpts: {
      cursor: null,
      numItems: 0,
    },

    streamArgs: {
      kind: "deltas" as const,
      cursors: activeStreams.value.map((stream) => ({
        streamId: stream.streamId,
        cursor:
          cursors.value[stream.streamId] ?? 0,
      })),
    },
  }));

  const deltaQuery = useConvexQuery(
    api.agents.chat.listMessages,
    deltaQueryArgs,
  );

  watch(
    () => deltaQuery.data.value?.streams,
    (streams) => {
      if (!streams || streams.kind !== "deltas") {
        return;
      }

      const nextStates = {
        ...streamStates.value,
      };

      const nextCursors = {
        ...cursors.value,
      };

      for (const delta of streams.deltas) {
        const state =
          nextStates[delta.streamId];

        if (!state) {
          continue;
        }

        const parts = Array.isArray(
          (delta as any).parts,
        )
          ? (delta as any).parts
          : [];

        for (const part of parts) {
          if (
            part?.type === "text-delta" &&
            typeof part.delta === "string"
          ) {
            state.content += part.delta;
          }

          if (
            part?.type === "text" &&
            typeof part.text === "string"
          ) {
            state.content += part.text;
          }
        }

        const previous =
          nextCursors[delta.streamId] ?? 0;

        if (delta.end > previous) {
          nextCursors[delta.streamId] =
            delta.end;
        }
      }

      streamStates.value = nextStates;
      cursors.value = nextCursors;
    },
    {
      deep: true,
    },
  );

  const messages = computed<AgentChatMessage[]>(() => {
    const persisted =
      messageQuery.data.value?.page ?? [];

    const active =
      Object.values(streamStates.value);

    const activeOrders = new Set(
      active.map((stream) => stream.order),
    );

    const result: Array<
      AgentChatMessage & { order: number }
    > = [];

    /*
     * Persisted messages.
     */
    for (const message of persisted) {
      if (activeOrders.has(message.order)) {
        continue;
      }

      result.push({
        id: message.key,
        role:
          message.role === "user"
            ? "user"
            : "assistant",
        content: message.text ?? "",
        order: message.order,
      });
    }

    /*
     * Streaming assistant messages.
     */
    for (const stream of active) {
      if (!stream.content) {
        continue;
      }

      result.push({
        id: stream.streamId,
        role: "assistant",
        content: stream.content,
        order: stream.order,
      });
    }

    /*
     * Optimistic user messages.
     *
     * Once Convex exposes a persisted message with the
     * same order, the optimistic copy is removed.
     */
    const persistedUserOrders = new Set(
      persisted
        .filter(
          (message) => message.role === "user",
        )
        .map((message) => message.order),
    );

    const latestOrder =
      result.length > 0
        ? Math.max(
            ...result.map(
              (message) => message.order,
            ),
          )
        : -1;

    optimisticMessages.value.forEach(
      (message, index) => {
        if (
          message.persistedOrder !== undefined &&
          persistedUserOrders.has(
            message.persistedOrder,
          )
        ) {
          return;
        }

        result.push({
          id: message.id,
          role: message.role,
          content: message.content,
          order:
            message.persistedOrder ??
            latestOrder + index + 1,
        });
      },
    );

    return result
      .sort((a, b) => a.order - b.order)
      .map(
        ({ order: _order, ...message }) =>
          message,
      );
  });

  const hasActiveStream = computed(
    () => activeStreams.value.length > 0,
  );

  const isLoading = computed(
    () =>
      isMutationPending.value ||
      waitingForResponse.value ||
      hasActiveStream.value,
  );

  const creationPhase = computed<
    "idle" | "creating"
  >(() =>
    isLoading.value
      ? "creating"
      : "idle",
  );

  const isCreating = computed(
    () => creationPhase.value === "creating",
  );

  const currentStepText = computed(() => {
    if (isMutationPending.value) {
      return "Starting Witness…";
    }

    if (hasActiveStream.value) {
      return "Witness is working on it…";
    }

    if (waitingForResponse.value) {
      return "Witness is thinking…";
    }

    return "Working on it…";
  });

  const creationStepIndex = ref(0);

  let assistantCountBeforeSend = 0;

  watch(
    messages,
    (nextMessages) => {
      const assistantCount =
        nextMessages.filter(
          (message) =>
            message.role === "assistant",
        ).length;

      if (
        waitingForResponse.value &&
        assistantCount >
          assistantCountBeforeSend
      ) {
        waitingForResponse.value = false;
      }
    },
    {
      deep: true,
    },
  );

  async function sendAgentMessage(
    prompt: string,
    _opts: SendAgentMessageOptions = {},
  ): Promise<void> {
    const cleanPrompt = prompt.trim();

    if (!cleanPrompt || isLoading.value) {
      return;
    }

    requestError.value = "";
    toolsUsed.value = [];

    assistantCountBeforeSend =
      messages.value.filter(
        (message) =>
          message.role === "assistant",
      ).length;

    waitingForResponse.value = true;

    const optimisticId =
      `optimistic-${crypto.randomUUID()}`;

    optimisticMessages.value.push({
      id: optimisticId,
      optimisticId,
      role: "user",
      content: cleanPrompt,
    });

    try {
      const result =
        await sendMessageMutation({
          prompt: cleanPrompt,
          threadId:
            threadId.value || undefined,
        });

      if (!result) {
        throw new Error(
          "Witness could not start the conversation.",
        );
      }

      threadId.value = result.threadId;

      const optimisticMessage =
        optimisticMessages.value.find(
          (message) =>
            message.optimisticId ===
            optimisticId,
        );

      if (optimisticMessage) {
        optimisticMessage.persistedOrder =
          result.messageOrder;
      }
    } catch (error) {
      optimisticMessages.value =
        optimisticMessages.value.filter(
          (message) =>
            message.optimisticId !==
            optimisticId,
        );

      waitingForResponse.value = false;

      requestError.value =
        error instanceof Error
          ? error.message
          : "Witness could not respond right now.";

      throw error;
    }
  }

  function abortAgentCreation() {
    waitingForResponse.value = false;
  }

  return {
    threadId,

    messages,
    toolsUsed,

    isLoading,
    creationPhase,
    isCreating,

    creationStepIndex,
    currentStepText,

    requestError,

    sendAgentMessage,
    abortAgentCreation,
  };
}