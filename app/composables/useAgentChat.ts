import { computed, ref } from "vue"

export interface AgentChatMessage {
  id: number
  role: "user" | "assistant"
  content: string
}

export interface AgentHistoryItem {
  role: "user" | "assistant"
  content: string
}

export interface SendAgentMessageOptions {
  tools?: string[]
  skills?: string[]
  signal?: AbortSignal
}

/** Shown in the creating pill until the backend streams its own `step` events. */
const FALLBACK_STEPS = [
  "Looking into what happened…",
  "Checking the details…",
  "Finding out what you can do…",
  "Working on it…",
]

const FALLBACK_ROTATION_MS = 2000

/**
 * Chat state for the new-agent page.
 *
 * Chain: `agent.vue` page -> this composable -> `/api/agent/chat`
 * (Nitro, holds the backend secret) -> FastAPI `{backend}/v1/agent/chat`.
 */
export function useAgentChat() {
  const messages = ref<AgentChatMessage[]>([])
  const toolsUsed = ref<string[]>([])
  const isLoading = ref(false)
  const creationPhase = ref<"idle" | "creating">("idle")
  const isCreating = computed(() => creationPhase.value === "creating")
  const requestError = ref("")

  const steps = ref<string[]>([...FALLBACK_STEPS])
  const creationStepIndex = ref(0)
  const currentStepText = computed(() => steps.value[creationStepIndex.value] ?? steps.value[0]!)
  const remoteSteps = ref(false)
  const fallbackTimer = ref<ReturnType<typeof setInterval> | null>(null)
  const abortController = ref<AbortController | null>(null)

  function stopFallbackRotation() {
    if (fallbackTimer.value) {
      clearInterval(fallbackTimer.value)
      fallbackTimer.value = null
    }
  }

  function startFallbackRotation() {
    stopFallbackRotation()
    if (remoteSteps.value) return
    creationStepIndex.value = 0
    fallbackTimer.value = setInterval(() => {
      creationStepIndex.value = (creationStepIndex.value + 1) % steps.value.length
    }, FALLBACK_ROTATION_MS)
  }

  /** A backend `step` event replaces the local rotation and drives the pill. */
  function onStepEvent(text: string) {
    const clean = text.trim()
    if (!clean) return
    if (!remoteSteps.value) {
      remoteSteps.value = true
      stopFallbackRotation()
      steps.value = [clean]
      creationStepIndex.value = 0
      return
    }
    steps.value = [...steps.value, clean]
    creationStepIndex.value = steps.value.length - 1
  }

  async function sendAgentMessage(
    prompt: string,
    opts: SendAgentMessageOptions = {}
  ): Promise<void> {
    const cleanPrompt = prompt.trim()
    if (!cleanPrompt || isLoading.value || isCreating.value) return

    requestError.value = ""
    toolsUsed.value = []
    steps.value = [...FALLBACK_STEPS]
    creationStepIndex.value = 0
    remoteSteps.value = false

    const history: AgentHistoryItem[] = messages.value.map((m) => ({
      role: m.role,
      content: m.content,
    }))
    messages.value.push({ id: Date.now(), role: "user", content: cleanPrompt })

    isLoading.value = true
    creationPhase.value = "creating"
    startFallbackRotation()

    const controller = new AbortController()
    abortController.value = controller
    if (opts.signal) {
      opts.signal.addEventListener("abort", () => controller.abort(), { once: true })
    }

    let assistantId: number | null = null
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null

    const appendDelta = (content: string) => {
      if (!content) return
      if (assistantId === null) {
        assistantId = Date.now() + 1
        messages.value.push({ id: assistantId, role: "assistant", content })
        return
      }
      const target = messages.value.find((m) => m.id === assistantId)
      if (target) target.content += content
    }

    const fail = (messageText: string): Error => {
      if (assistantId !== null) {
        const idx = messages.value.findIndex((m) => m.id === assistantId)
        if (idx !== -1 && !messages.value[idx]!.content) messages.value.splice(idx, 1)
      }
      requestError.value = messageText
      return new Error(messageText)
    }

    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "text/event-stream, application/json",
        },
        body: JSON.stringify({
          prompt: cleanPrompt,
          // tools: opts.tools ?? [],
          // skills: opts.skills ?? [],
          history,
        }),
        signal: controller.signal,
      })

      const contentType = response.headers.get("content-type") ?? ""

      if (!response.ok || !response.body) {
        let detail = ""
        try {
          const errJson = (await response.json()) as { statusMessage?: unknown }
          if (typeof errJson?.statusMessage === "string") detail = errJson.statusMessage
        } catch {
          // Fall through to the generic message.
        }
        throw fail(detail || `Witness had an error (HTTP ${response.status}).`)
      }

      // Plain JSON fallback (also normalised server-side, kept here for robustness).
      if (!contentType.includes("text/event-stream")) {
        const data = (await response.json()) as {
          message?: unknown
          steps?: unknown
          tools?: unknown
        }
        if (Array.isArray(data.steps)) {
          for (const step of data.steps) if (typeof step === "string") onStepEvent(step)
        }
        if (Array.isArray(data.tools)) {
          toolsUsed.value = data.tools.filter((t): t is string => typeof t === "string")
        }
        const text = typeof data.message === "string" ? data.message : ""
        if (!text) throw fail("Witness returned an empty response. Please try again.")
        appendDelta(text)
        return
      }

      reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      const handleEvent = (name: string, raw: string): void => {
        let data: any = null
        try {
          data = raw ? JSON.parse(raw) : null
        } catch {
          data = raw
        }
        if (name === "step" && data && typeof data.text === "string") onStepEvent(data.text)
        else if (name === "delta" && data && typeof data.content === "string") {
          appendDelta(data.content)
        } else if (name === "tools" && data && Array.isArray(data.tools)) {
          toolsUsed.value = data.tools.filter((t: unknown): t is string => typeof t === "string")
        } else if (name === "error") {
          const messageText =
            data && typeof data.message === "string" && data.message
              ? data.message
              : "Witness could not respond right now. Please try again."
          throw fail(messageText)
        }
        // `done` needs no action — completion is detected by stream end.
      }

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let boundary = buffer.indexOf("\n\n")
        while (boundary !== -1) {
          const chunk = buffer.slice(0, boundary)
          buffer = buffer.slice(boundary + 2)
          let eventName = ""
          const dataLines: string[] = []
          for (const line of chunk.split("\n")) {
            if (line.startsWith("event:")) eventName = line.slice(6).trim()
            else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart())
          }
          if (eventName) handleEvent(eventName, dataLines.join("\n"))
          boundary = buffer.indexOf("\n\n")
        }
      }

      if (assistantId === null) throw fail("Witness returned an empty response. Please try again.")
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error
      if (error instanceof Error && requestError.value) throw error
      const messageText =
        error instanceof TypeError
          ? "Witness could not respond right now. Please try again."
          : error instanceof Error && error.message
            ? error.message
            : "Witness could not respond right now. Please try again."
      throw fail(messageText)
    } finally {
      try {
        await reader?.cancel()
      } catch {
        // Stream already closed — nothing to do.
      }
      stopFallbackRotation()
      abortController.value = null
      isLoading.value = false
      creationPhase.value = "idle"
    }
  }

  function abortAgentCreation() {
    abortController.value?.abort()
    stopFallbackRotation()
    isLoading.value = false
    creationPhase.value = "idle"
  }

  return {
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
  }
}