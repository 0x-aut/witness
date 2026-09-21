import { computed, ref, watch } from "vue";
import { api } from "@@/convex/_generated/api";

export interface AgentChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface SendAgentMessageOptions {
  tools?: string[];
  skills?: string[];
  signal?: AbortSignal;
}

interface StreamState {
  streamId: string;
  order: number;
  stepOrder: number;
  content: string;
}

interface RenderedMessage extends AgentChatMessage {
  order: number;
  stepOrder: number;
}

interface OptimisticAgentChatMessage extends AgentChatMessage {
  optimisticId: string;
  persistedOrder?: number;
}

function streamKey(
  order: number,
  stepOrder: number,
) {
  return `${order}:${stepOrder}`;
}

export function useAgentChat(
  initialThread = "",
) {
  const optimisticMessages = ref<OptimisticAgentChatMessage[]>([]);

  const threadId = ref(initialThread);

  const requestError = ref("");

  const waitingForResponse =
    ref(false);

  const toolsUsed = ref<string[]>([]);

  const generationOrder =
    ref<number | null>(null);

  const cancelRequested = ref(false);

  const isUploadingFiles =
    ref(false);

  const isDecliningUserAction =
    ref(false);

  /*
   * Once an interruption is resolved locally, don't keep showing
   * the stale pending action while Convex propagates the mutation.
   */
  const dismissedActionId =
    ref<string | null>(null);

  const {
    mutate: sendMessageMutation,
    isPending: isMutationPending,
  } = useConvexMutation(
    api.agents.chat.sendMessage,
  );

  const {
    mutate: cancelGenerationMutation,
  } = useConvexMutation(
    api.agents.chat.cancelGeneration,
  );

  const {
    mutate: resolveUserActionMutation,
  } = useConvexMutation(
    api.agents.chat.resolveUserAction,
  );

  const {
    mutate: declineUserActionMutation,
  } = useConvexMutation(
    api.agents.chat.declineUserAction,
  );

  const {
    mutate: generateUploadUrlMutation,
  } = useConvexMutation(
    api.agents.chat.generateUploadUrl,
  );

  const pendingUserActionQuery =
    useConvexQuery(
      api.agents.chat.getPendingUserAction,
      computed(() => ({
        threadId: threadId.value,
      })),
    );

  const pendingUserAction = computed(
    () =>
      pendingUserActionQuery.data.value ??
      null,
  );

  watch(
    () => pendingUserAction.value?.id ?? null,
    (actionId) => {
      if (
        actionId &&
        actionId !== dismissedActionId.value
      ) {
        dismissedActionId.value = null;
      }

      if (!actionId) {
        dismissedActionId.value = null;
      }
    },
    {
      immediate: true,
    },
  );

  const hasPendingUserAction = computed(
    () =>
      Boolean(
        pendingUserAction.value,
      ) &&
      dismissedActionId.value !==
        pendingUserAction.value?.id,
  );

  const isWaitingForUser = computed(
    () => hasPendingUserAction.value,
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

    if (
      !streams ||
      streams.kind !== "list"
    ) {
      return [];
    }

    return streams.messages;
  });

  /*
   * Keep stream content separate from the persisted messages.
   *
   * A finished stream can disappear from syncStreams before the
   * reactive listUIMessages result has caught up. Keeping the last
   * streamed value prevents the assistant bubble from flashing away.
   */
  const cursors =
    ref<Record<string, number>>({});

  const streamStates =
    ref<Record<string, StreamState>>({});

  const completedStreamStates =
    ref<Record<string, StreamState>>({});

  watch(
    threadId,
    () => {
      cursors.value = {};
      streamStates.value = {};
      completedStreamStates.value = {};
      optimisticMessages.value = [];
      dismissedActionId.value = null;
      waitingForResponse.value = false;
      generationOrder.value = null;
    },
  );

  watch(
    activeStreams,
    (streams) => {
      const activeIds = new Set(
        streams.map(
          (stream) =>
            stream.streamId,
        ),
      );

      /*
       * Preserve streams that disappeared from the active list.
       */
      for (const [
        streamId,
        state,
      ] of Object.entries(
        streamStates.value,
      )) {
        if (
          !activeIds.has(streamId) &&
          state.content
        ) {
          completedStreamStates.value[
            streamId
          ] = {
            ...state,
          };
        }
      }

      /*
       * Don't allow this cache to grow forever.
       * The UI only needs a small recent tail.
       */
      const completedIds =
        Object.keys(
          completedStreamStates.value,
        );

      if (completedIds.length > 20) {
        const removeCount =
          completedIds.length - 20;

        for (
          let index = 0;
          index < removeCount;
          index += 1
        ) {
          const streamId =
            completedIds[index];

          if (streamId) {
            delete completedStreamStates
              .value[streamId];
          }
        }
      }

      const nextStates: Record<
        string,
        StreamState
      > = {};

      for (const stream of streams) {
        const existing =
          streamStates.value[
            stream.streamId
          ];

        nextStates[stream.streamId] =
          existing ?? {
            streamId:
              stream.streamId,
            order: stream.order,
            stepOrder:
              stream.stepOrder,
            content: "",
          };

        nextStates[
          stream.streamId
        ]!.order = stream.order;

        nextStates[
          stream.streamId
        ]!.stepOrder =
          stream.stepOrder;

        /*
         * If a stream is active again, its active state is authoritative.
         */
        delete completedStreamStates
          .value[stream.streamId];
      }

      streamStates.value =
        nextStates;

      const nextCursors: Record<
        string,
        number
      > = {};

      for (const [
        streamId,
        cursor,
      ] of Object.entries(
        cursors.value,
      )) {
        if (
          activeIds.has(streamId)
        ) {
          nextCursors[streamId] =
            cursor;
        }
      }

      cursors.value = nextCursors;
    },
    {
      immediate: true,
      deep: true,
    },
  );

  const deltaQueryArgs =
    computed(() => ({
      threadId: threadId.value,

      paginationOpts: {
        cursor: null,
        numItems: 0,
      },

      streamArgs: {
        kind: "deltas" as const,
        cursors:
          activeStreams.value.map(
            (stream) => ({
              streamId:
                stream.streamId,
              cursor:
                cursors.value[
                  stream.streamId
                ] ?? 0,
            }),
          ),
      },
    }));

  const deltaQuery =
    useConvexQuery(
      api.agents.chat.listMessages,
      deltaQueryArgs,
    );

  /*
   * AI SDK / Convex Agent currently stores modern UIMessageChunk
   * deltas. Keep this intentionally tolerant because the component
   * supports both the modern UIMessageChunk shape and the older
   * TextStreamPart text shape.
   */
  function extractDeltaText(
    delta: unknown,
  ) {
    if (
      !delta ||
      typeof delta !== "object"
    ) {
      return "";
    }

    const value =
      delta as Record<
        string,
        unknown
      >;

    const parts = Array.isArray(
      value.parts,
    )
      ? value.parts
      : [];

    let text = "";
    let foundTextDelta = false;

    for (const part of parts) {
      if (
        !part ||
        typeof part !== "object"
      ) {
        continue;
      }

      const item =
        part as Record<
          string,
          unknown
        >;

      if (
        item.type ===
          "text-delta" &&
        typeof item.delta ===
          "string"
      ) {
        text += item.delta;
        foundTextDelta = true;
      }
    }

    /*
     * Legacy / fallback text chunks.
     */
    if (!foundTextDelta) {
      for (const part of parts) {
        if (
          !part ||
          typeof part !== "object"
        ) {
          continue;
        }

        const item =
          part as Record<
            string,
            unknown
          >;

        if (
          item.type === "text" &&
          typeof item.text ===
            "string"
        ) {
          text += item.text;
        }
      }
    }

    /*
     * Defensive fallback if a provider/adapter
     * returns the text directly on the delta.
     */
    if (
      !text &&
      typeof value.delta ===
        "string"
    ) {
      text = value.delta;
    }

    if (
      !text &&
      typeof value.text ===
        "string" &&
      value.type === "text"
    ) {
      text = value.text;
    }

    return text;
  }

  watch(
    () => deltaQuery.data.value?.streams,
    (streams) => {
      if (
        !streams ||
        streams.kind !== "deltas"
      ) {
        return;
      }

      const nextStates: Record<
        string,
        StreamState
      > = {
        ...streamStates.value,
      };

      const nextCursors: Record<
        string,
        number
      > = {
        ...cursors.value,
      };

      for (const delta of streams.deltas) {
        const state =
          nextStates[
            delta.streamId
          ];

        if (!state) {
          continue;
        }

        const previousCursor =
          nextCursors[
            delta.streamId
          ] ?? 0;

        /*
         * syncStreams is cursor based. Ignore an already-consumed
         * delta rather than appending it twice.
         */
        if (
          delta.end <=
          previousCursor
        ) {
          continue;
        }

        const text =
          extractDeltaText(delta);

        if (text) {
          state.content += text;
        }

        nextCursors[
          delta.streamId
        ] = Math.max(
          previousCursor,
          delta.end,
        );
      }

      streamStates.value =
        nextStates;

      cursors.value =
        nextCursors;
    },
    {
      deep: true,
    },
  );

  const messages = computed<
    AgentChatMessage[]
  >(() => {
    const persisted =
      messageQuery.data.value
        ?.page ?? [];

    const messageMap =
      new Map<
        string,
        RenderedMessage
      >();

    /*
     * Persisted UIMessages.
     */
    for (const message of persisted) {
      const order =
        Number(message.order ?? 0);

      const stepOrder =
        Number(
          message.stepOrder ?? 0,
        );

      const normalized: RenderedMessage =
        {
          id: message.key,
          role:
            message.role === "user"
              ? "user"
              : "assistant",
          content:
            message.text ?? "",
          order,
          stepOrder,
        };

      messageMap.set(
        streamKey(
          order,
          stepOrder,
        ),
        normalized,
      );
    }

    /*
     * Active streams replace the persisted copy of the exact same
     * (order, stepOrder) pair, but not previous steps from the same
     * order. This is the important distinction for tool calls.
     */
    for (const state of Object.values(
      streamStates.value,
    )) {
      if (!state.content) {
        continue;
      }

      messageMap.set(
        streamKey(
          state.order,
          state.stepOrder,
        ),
        {
          id: state.streamId,
          role: "assistant",
          content:
            state.content,
          order: state.order,
          stepOrder:
            state.stepOrder,
        },
      );
    }

    /*
     * Preserve the final streamed text until the persisted message
     * is visible. Never overwrite an already-persisted non-empty copy.
     */
    for (const state of Object.values(
      completedStreamStates.value,
    )) {
      if (!state.content) {
        continue;
      }

      const key = streamKey(
        state.order,
        state.stepOrder,
      );

      const existing =
        messageMap.get(key);

      if (
        !existing ||
        !existing.content
      ) {
        messageMap.set(key, {
          id: state.streamId,
          role: "assistant",
          content:
            state.content,
          order: state.order,
          stepOrder:
            state.stepOrder,
        });
      }
    }

    const persistedUserOrders =
      new Set(
        persisted
          .filter(
            (message) =>
              message.role ===
              "user",
          )
          .map(
            (message) =>
              Number(
                message.order ?? 0,
              ),
          ),
      );

    const currentMessages =
      Array.from(
        messageMap.values(),
      );

    const latestOrder =
      currentMessages.length > 0
        ? Math.max(
            ...currentMessages.map(
              (message) =>
                message.order,
            ),
          )
        : -1;

    /*
     * Optimistic user messages.
     */
    optimisticMessages.value.forEach(
      (message, index) => {
        if (
          message.persistedOrder !==
            undefined &&
          persistedUserOrders.has(
            message.persistedOrder,
          )
        ) {
          return;
        }

        const order =
          message.persistedOrder ??
          latestOrder + index + 1;

        const key = streamKey(
          order,
          0,
        );

        if (
          !messageMap.has(key)
        ) {
          messageMap.set(
            key,
            {
              id: message.id,
              role: "user",
              content:
                message.content,
              order,
              stepOrder: 0,
            },
          );
        }
      },
    );

    return Array.from(
      messageMap.values(),
    )
      .sort((a, b) => {
        if (
          a.order !== b.order
        ) {
          return a.order - b.order;
        }

        return (
          a.stepOrder -
          b.stepOrder
        );
      })
      .map(
        ({
          order: _order,
          stepOrder: _stepOrder,
          ...message
        }) => message,
      );
  });

  const hasActiveStream =
    computed(
      () =>
        activeStreams.value
          .length > 0,
    );

  const isGenerating =
    computed(
      () =>
        isMutationPending.value ||
        waitingForResponse.value ||
        hasActiveStream.value,
    );

  const isLoading =
    computed(
      () =>
        isGenerating.value ||
        isWaitingForUser.value ||
        isUploadingFiles.value ||
        isDecliningUserAction.value,
    );

  const creationPhase =
    computed<
      "idle" |
      "creating" |
      "waiting_user"
    >(() => {
      if (
        isWaitingForUser.value
      ) {
        return "waiting_user";
      }

      if (
        isGenerating.value ||
        isUploadingFiles.value ||
        isDecliningUserAction.value
      ) {
        return "creating";
      }

      return "idle";
    });

  const isCreating =
    computed(
      () =>
        creationPhase.value ===
        "creating",
    );

  const currentStepText =
    computed(() => {
      if (
        isUploadingFiles.value
      ) {
        return "Uploading your documents…";
      }

      if (
        isDecliningUserAction.value
      ) {
        return "Continuing…";
      }

      if (
        isMutationPending.value
      ) {
        return "Starting Witness…";
      }

      if (
        hasActiveStream.value
      ) {
        return "Witness is working on it…";
      }

      if (
        waitingForResponse.value
      ) {
        return "Witness is thinking…";
      }

      if (
        isWaitingForUser.value
      ) {
        return "Waiting for you…";
      }

      return "Working on it…";
    });

  const creationStepIndex =
    ref(0);

  let assistantCountBeforeSend =
    0;

  watch(
    messages,
    (nextMessages) => {
      const assistantCount =
        nextMessages.filter(
          (message) =>
            message.role ===
            "assistant",
        ).length;

      if (
        waitingForResponse.value &&
        assistantCount >
          assistantCountBeforeSend
      ) {
        waitingForResponse.value =
          false;
      }
    },
    {
      deep: true,
    },
  );

  async function resolveUserAction(
    actionId: string,
    response?: string,
    files: File[] = [],
  ) {
    if (
      isUploadingFiles.value ||
      isDecliningUserAction.value
    ) {
      return;
    }

    if (!files.length) {
      throw new Error(
        "At least one document is required.",
      );
    }

    requestError.value = "";

    assistantCountBeforeSend =
      messages.value.filter(
        (message) =>
          message.role ===
          "assistant",
      ).length;

    waitingForResponse.value =
      true;

    isUploadingFiles.value =
      true;

    try {
      const uploadedFiles: Array<{
        storageId: string;
        filename: string;
        mimeType: string;
        size: number;
      }> = [];

      for (const file of files) {
        const uploadUrl =
          await generateUploadUrlMutation(
            {},
          );

        const uploadResponse =
          await fetch(
            uploadUrl,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  file.type ||
                  "application/octet-stream",
              },
              body: file,
            },
          );

        if (
          !uploadResponse.ok
        ) {
          throw new Error(
            `Failed to upload ${file.name}.`,
          );
        }

        const body =
          (await uploadResponse.json()) as {
            storageId: string;
          };

        if (
          !body.storageId
        ) {
          throw new Error(
            `Upload failed for ${file.name}.`,
          );
        }

        uploadedFiles.push({
          storageId:
            body.storageId,
          filename:
            file.name,
          mimeType:
            file.type ||
            "application/octet-stream",
          size: file.size,
        });
      }

      const result =
        await resolveUserActionMutation(
          {
            actionId,
            response,
            files:
              uploadedFiles,
          },
        );

      dismissedActionId.value =
        actionId;

      if (
        result &&
        typeof result.messageOrder ===
          "number"
      ) {
        generationOrder.value =
          result.messageOrder;
      }
    } catch (error) {
      waitingForResponse.value =
        false;

      requestError.value =
        error instanceof Error
          ? error.message
          : "The documents could not be uploaded.";

      throw error;
    } finally {
      isUploadingFiles.value =
        false;
    }
  }

  async function declineUserAction(
    actionId: string,
  ) {
    if (
      isUploadingFiles.value ||
      isDecliningUserAction.value
    ) {
      return;
    }

    requestError.value = "";

    assistantCountBeforeSend =
      messages.value.filter(
        (message) =>
          message.role ===
          "assistant",
      ).length;

    waitingForResponse.value =
      true;

    isDecliningUserAction.value =
      true;

    try {
      const result =
        await declineUserActionMutation(
          {
            actionId,
          },
        );

      dismissedActionId.value =
        actionId;

      if (
        result &&
        typeof result.messageOrder ===
          "number"
      ) {
        generationOrder.value =
          result.messageOrder;
      }
    } catch (error) {
      waitingForResponse.value =
        false;

      requestError.value =
        error instanceof Error
          ? error.message
          : "Witness could not continue right now.";

      throw error;
    } finally {
      isDecliningUserAction.value =
        false;
    }
  }

  async function sendAgentMessage(
    prompt: string,
    _opts: SendAgentMessageOptions = {},
  ): Promise<void> {
    const cleanPrompt =
      prompt.trim();

    if (
      !cleanPrompt ||
      isLoading.value
    ) {
      return;
    }

    requestError.value = "";
    toolsUsed.value = [];

    assistantCountBeforeSend =
      messages.value.filter(
        (message) =>
          message.role ===
          "assistant",
      ).length;

    waitingForResponse.value =
      true;

    const optimisticId =
      `optimistic-${crypto.randomUUID()}`;

    optimisticMessages.value.push(
      {
        id: optimisticId,
        optimisticId,
        role: "user",
        content: cleanPrompt,
      },
    );

    try {
      const result =
        await sendMessageMutation({
          prompt: cleanPrompt,
          threadId:
            threadId.value ||
            undefined,
        });

      if (!result) {
        throw new Error(
          "Witness could not start the conversation.",
        );
      }

      threadId.value =
        result.threadId;

      generationOrder.value =
        result.messageOrder;

      /*
       * Handles the user pressing stop between the initial mutation
       * and Convex returning the created thread/order.
       */
      if (cancelRequested.value) {
        cancelRequested.value =
          false;

        await cancelGenerationMutation(
          {
            threadId:
              result.threadId,
            order:
              result.messageOrder,
          },
        );

        generationOrder.value =
          null;
      }

      const optimisticMessage =
        optimisticMessages.value.find(
          (item) =>
            item.optimisticId ===
            optimisticId,
        );

      if (
        optimisticMessage
      ) {
        optimisticMessage.persistedOrder =
          result.messageOrder;
      }
    } catch (error) {
      optimisticMessages.value =
        optimisticMessages.value.filter(
          (item) =>
            item.optimisticId !==
            optimisticId,
        );

      waitingForResponse.value =
        false;

      requestError.value =
        error instanceof Error
          ? error.message
          : "Witness could not respond right now.";

      throw error;
    }
  }

  async function abortAgentCreation() {
    cancelRequested.value =
      true;

    waitingForResponse.value =
      false;

    if (!threadId.value) {
      cancelRequested.value =
        false;

      return;
    }

    try {
      await cancelGenerationMutation(
        {
          threadId:
            threadId.value,
          order:
            generationOrder.value ??
            undefined,
        },
      );
    } finally {
      generationOrder.value =
        null;

      cancelRequested.value =
        false;
    }
  }

  return {
    threadId,

    messages,
    toolsUsed,

    isLoading,
    isGenerating,
    isWaitingForUser,
    isUploadingFiles,
    isDecliningUserAction,

    creationPhase,
    isCreating,

    creationStepIndex,
    currentStepText,

    pendingUserAction,
    hasPendingUserAction,

    resolveUserAction,
    declineUserAction,

    abortAgentCreation,

    requestError,

    sendAgentMessage,
  };
}