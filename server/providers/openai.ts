import OpenAI from "openai";
import { bedrock } from "openai/providers/bedrock";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (client) return client

  const config = useRuntimeConfig()

  if (!config.bedrockApiKey) {
    throw new Error("Bedrock API Key is missing from environment, add NUXT_BEDROCK_API_KEY to the .env.local")
  }

  if (!config.bedrockBaseUrl) {
    throw new Error("Bedrock base url is missing from environment, add NUXT_BEDROCK_BASE_URL to the .env.local")
  }

  // client = new OpenAI({
  //   provider: bedrock({
  //     apiKey: config.bedrockApiKey,
  //     region: "us-east-2",
  //     endpoint: "runtime",
  //   }),
  // })

  client = new OpenAI({
    apiKey: config.qwenApiKey,
    baseURL: config.qwenBaseUrl,
  })

  return client
}

