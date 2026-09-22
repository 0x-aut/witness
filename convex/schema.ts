import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";


const country = v.union(
  v.literal("US"),
  v.literal("CA"),
);

export default defineSchema({
  cases: defineTable({
    userId: v.string(),
    title: v.string(),
    originalPrompt: v.string(),
    summary: v.optional(v.string()),
    category: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("waiting_user"),
      v.literal("resolved"),
      v.literal("archived"),
    ),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_user_id_status", ["userId", "status"]),

  caseActivities: defineTable({
    userId: v.string(),
    caseId: v.id("cases"),
    agentId: v.optional(v.id("agents")),
  
    type: v.union(
      v.literal("created"),
      v.literal("agent_action"),
      v.literal("research"),
      v.literal("email"),
      v.literal("user_action"),
      v.literal("status_changed"),
      v.literal("external_response"),
    ),
  
    title: v.string(),
    description: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_case_id", ["caseId"])
    .index("by_case_id_created_at", ["caseId", "createdAt"])
    .index("by_user_id", ["userId"]),
  
  caseWidgets: defineTable({
    userId: v.string(),
    caseId: v.id("cases"),
  
    type: v.union(
      v.literal("email"),
      v.literal("research"),
      v.literal("document"),
      v.literal("action"),
      v.literal("approval"),
      v.literal("question"),
      v.literal("link"),
      v.literal("result"),
    ),
  
    data: v.any(),
  
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_case_id", ["caseId"])
    .index("by_user_id", ["userId"]),
  
  caseBlocks: defineTable({
    userId: v.string(),
    caseId: v.id("cases"),
  
    type: v.union(
      v.literal("narrative"),
      v.literal("widget"),
    ),
  
    order: v.number(),
  
    // Used when type === "narrative"
    text: v.optional(v.string()),
  
    // Used when type === "widget"
    widgetIds: v.optional(
      v.array(v.id("caseWidgets")),
    ),
  
    // Activities that caused this narrative block to be generated.
    sourceActivityIds: v.optional(
      v.array(v.id("caseActivities")),
    ),
  
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_case_id", ["caseId"])
    .index("by_case_id_order", ["caseId", "order"])
    .index("by_user_id", ["userId"]),

  agents: defineTable({
    userId: v.string(),
    caseId: v.optional(v.id("cases")),
    name: v.string(),
    title: v.optional(v.string()),
    task: v.string(),
    status: v.union(
      v.literal("running"),
      v.literal("needs_user_action"),
      v.literal("waiting"),
      v.literal("finished"),
      v.literal("error"),
      v.literal("stopped"),
    ),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_case_id", ["caseId"])
    .index("by_case_id_status", ["caseId", "status"]),

  agentThreads: defineTable({
    userId: v.string(),
    caseId: v.optional(v.id("cases")),
    agentId: v.id("agents"),
    externalThreadId: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_case_id", ["caseId"])
    .index("by_agent_id", ["agentId"])
    .index("by_external_thread_id", ["externalThreadId"]),
  
  inboxItems: defineTable({
    userId: v.string(),
    caseId: v.optional(v.id("cases")),
    agentId: v.optional(v.id("agents")),
  
    types: v.union(
      v.literal("email"),
      v.literal("alert"),
      v.literal("notification"),
      v.literal("agent_update"),
      v.literal("case_update"),
    ),
  
    title: v.string(),
    preview: v.string(),
    content: v.string(),
  
    read: v.boolean(),
    starred: v.boolean(),
  
    draftStatus: v.optional(
      v.union(
        v.literal("drafting"),
        v.literal("ready"),
        v.literal("error"),
        v.literal("sent"),
        v.literal("dismissed"),
      ),
    ),
  
    draftText: v.optional(v.string()),
  
    source: v.optional(v.string()),
    threadId: v.optional(v.string()),
    externalId: v.optional(v.string()),
  
    sender: v.optional(v.string()),
    subject: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_user_id_read", ["userId", "read"])
    .index("by_case_id", ["caseId"])
    .index("by_user_id_external_id", ["userId", "externalId"]),

  agentMailInboxes: defineTable({
    userId: v.string(),
    inboxId: v.string(),
    email: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_inbox_id", ["inboxId"]),
  
  agentMailThreads: defineTable({
    userId: v.string(),
    inboxId: v.string(),
    threadId: v.string(),
    caseId: v.optional(v.id("cases")),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_thread_id", ["threadId"])
    .index("by_case_id", ["caseId"])
    .index("by_user_id_thread_id", ["userId", "threadId"]),

  userActions: defineTable({
    userId: v.string(),
  
    caseId: v.id("cases"),
    agentId: v.id("agents"),
  
    type: v.union(
      v.literal("upload_file"),
      v.literal("question"),
      v.literal("approval"),
    ),
  
    prompt: v.string(),
  
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
  
    response: v.optional(v.string()),
  
    metadata: v.optional(v.any()),
  
    completedAt: v.optional(v.number()),
  })
    .index("by_user_id", ["userId"])
    .index("by_agent_id", ["agentId"])
    .index("by_case_id", ["caseId"])
    .index("by_status", ["status"]),
  
  composioSessions: defineTable({
    userId: v.string(),
    sessionId: v.string(),
    toolkits: v.array(v.string()),
    updatedAt: v.number(),
  }).index("by_user_id", ["userId"]),

  files: defineTable({
    userId: v.string(),
    caseId: v.id("cases"),
    agentId: v.optional(v.id("agents")),
  
    storageId: v.id("_storage"),
  
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
  
    threadId: v.optional(v.string()),
    messageOrder: v.optional(v.number()),
    parseStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("parsed"),
        v.literal("error"),
      ),
    ),
    
    parsedMarkdown: v.optional(v.string()),
    parsedSummary: v.optional(v.string()),
    parsedAt: v.optional(v.number()),
    parseMode: v.optional(
      v.union(
        v.literal("fast"),
        v.literal("auto"),
        v.literal("ocr"),
      ),
    ),
    parseError: v.optional(v.string()),
    parsedCharCount: v.optional(v.number()),
    parsedTruncated: v.optional(v.boolean()),
  })
    .index("by_user_id", ["userId"])
    .index("by_case_id", ["caseId"])
    .index("by_agent_id", ["agentId"])
    .index("by_thread_id_order", [
      "threadId",
      "messageOrder",
    ]),
  
  userContext: defineTable({
    userId: v.string(),
    content: v.string(),
    updatedAt: v.number(),
  }).index("by_user_id", ["userId"]),

  integrations: defineTable({
    userId: v.string(),
  
    provider: v.string(),
    toolkit: v.string(),
  
    connectionId: v.optional(v.string()),
  
    status: v.union(
      v.literal("connected"),
      v.literal("disconnected"),
      v.literal("error"),
    ),
  
    accountLabel: v.optional(v.string()),
  
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_user_id_provider", ["userId", "provider"]),
})