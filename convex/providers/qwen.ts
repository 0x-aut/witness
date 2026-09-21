import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function getQwenModel() {
  const apiKey = process.env.QWEN_API_KEY;
  const baseURL = process.env.QWEN_BASE_URL;

  if (!apiKey) {
    throw new Error("QWEN_API_KEY is not configured.");
  }

  if (!baseURL) {
    throw new Error("QWEN_BASE_URL is not configured.");
  }


  const qwen = createOpenAICompatible({
    name: "qwen",
    apiKey,
    baseURL,
    supportsStructuredOutputs: true,
  });

  return qwen.chatModel("qwen3.8-flash");
}