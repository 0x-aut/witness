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
      v.literal("status_changed"),
    ),
  
    title: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_case_id", ["caseId"])
    .index("by_user_id", ["userId"]),

  agents: defineTable({
    userId: v.string(),
    caseId: v.id("cases"),
    name: v.string(),
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
    caseId: v.id("cases"),
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

    source: v.optional(v.string()),
    externalId: v.optional(v.string()),

    sender: v.optional(v.string()),
    subject: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_user_id_read", ["userId", "read"])
    .index("by_case_id", ["caseId"]),

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

  files: defineTable({
    userId: v.string(),
    caseId: v.id("cases"),
    agentId: v.optional(v.id("agents")),
  
    storageId: v.id("_storage"),
  
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_case_id", ["caseId"])
    .index("by_agent_id", ["agentId"]),

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