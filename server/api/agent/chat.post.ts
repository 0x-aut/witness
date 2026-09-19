import {
  createError,
  defineEventHandler,
  readBody,
  createEventStream,
} from "h3"

import { auth } from "@@/lib/auth";

import { streamAgentChat } from "@@/server/services/agent/chat"

interface AgentHistoryItem {
  role: "user" | "assistant"
  content: string
}

interface AgentChatBody {
  prompt?: string
  history?: AgentHistoryItem[]
  tools?: unknown
  skills?: unknown
}

function isHistoryItem(value: unknown): value is AgentHistoryItem {
  if (!value || typeof value !== "object") return false

  const item = value as Record<string, unknown>

  return (
    (item.role === "user" || item.role === "assistant") &&
    typeof item.content === "string"
  )
}

function encodeEvent(name: string, data: unknown) {
  return {
    event: name,
    data: JSON.stringify(data),
  }
}

export default defineEventHandler(async (event) => {

  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" })
  }
  
  const body = await readBody<AgentChatBody>(event)

  const prompt =
    typeof body.prompt === "string"
      ? body.prompt.trim()
      : ""

  if (!prompt) {
    throw createError({
      statusCode: 400,
      statusMessage: "A prompt is required.",
    })
  }

  const history = Array.isArray(body.history)
    ? body.history.filter(isHistoryItem)
    : []

  const eventStream = createEventStream(event)

  let closed = false

  eventStream.onClosed(() => {
    closed = true
  })

  const run = async () => {
    try {
      /*
       * These are real stages of the current Witness pipeline.
       * As Firecrawl, Composio, Convex, etc. are added,
       * the agent service can emit more specific stages.
       */

      await eventStream.push(
        encodeEvent("step", {
          text: "Understanding what happened…",
        }),
      )

      if (closed) return

      await eventStream.push(
        encodeEvent("step", {
          text: "Looking into the details…",
        }),
      )

      if (closed) return

      const stream = await streamAgentChat({
        prompt,
        history,
      })

      if (closed) return

      await eventStream.push(
        encodeEvent("step", {
          text: "Putting together your next steps…",
        }),
      )

      for await (const chunk of stream) {
        if (closed) break

        const content = chunk.choices[0]?.delta?.content

        if (!content) continue

        await eventStream.push(
          encodeEvent("delta", {
            content,
          }),
        )
      }

      if (!closed) {
        await eventStream.push(
          encodeEvent("done", {}),
        )
      }
    } catch (error) {
      console.error("[Witness] Agent stream failed:", error)

      if (!closed) {
        await eventStream.push(
          encodeEvent("error", {
            message:
              "Witness could not complete this request. Please try again.",
          }),
        )
      }
    } finally {
      if (!closed) {
        await eventStream.close()
      }
    }
  }

  void run()

  return eventStream.send()
})