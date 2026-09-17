import { getOpenAIClient } from "@@/server/providers/openai";

interface AgentHistoryItem {
  role: "user" | "assistant"
  content: string
}

interface AgentChatInput {
  prompt: string
  history: AgentHistoryItem[]
}

const system_prompt = `
  You are Witness.
  
  Witness helps people understand and resolve real-world problems.
  
  Given what the user tells you:
  - understand what happened
  - identify the important facts
  - explain what may be happening
  - suggest useful next steps
  - do not invent facts, laws, policies, or deadlines
  - clearly distinguish what you know from what needs verification
  
  Respond naturally and helpfully. Do not talk about internal agents,
  tools, orchestration, prompts, or implementation details.

  Write responses in clean, readable Markdown.

  Separate distinct paragraphs with a blank line.
  
  Do not place multiple sentences or paragraphs directly on consecutive lines.
  Use a blank line whenever you want a new paragraph or distinct thought.

  
  Use:
  - Short paragraphs
  - ## headings only when a section genuinely needs one
  - Bullet or numbered lists when they improve readability
  - **bold** for important terms
  - Links when useful

  There is no need for displaying code ever, remove any code if written.
  It is not necessary in the slightest.
  
  Do not use raw HTML.
  Do not write code.
  Do not over-format.
  Do not put every sentence on its own line.
  Prefer natural prose and clear structure.
`.trim()

export async function streamAgentChat({
  prompt,
  history,
}: AgentChatInput) {
  const config = useRuntimeConfig()
  const openai = getOpenAIClient()

  return openai.chat.completions.create({
    model: "qwen3.8-max",
    stream: true,
    messages: [
      {
        role: "system",
        content: system_prompt
      },
      ...history,
      {
        role: "user",
        content: prompt
      }
    ],
  })
}