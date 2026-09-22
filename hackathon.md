# Convex All Gas Hackathon — Build Log

## Project

**Witness**

Witness helps people deal with bureaucratic problems by understanding what happened, organizing the relevant information, figuring out what they can do next, and helping move the situation toward resolution.

## Hackathon

**Event:** Convex All Gas Hackathon

## Frontend

**Frontend:** Nuxt 4 / TypeScript

The application is being built with Nuxt 4 and TypeScript.

## Build Status

**Stage:** Core development

**Live app:** Not deployed

**Convex deployment:** Not yet verified

## Stack

* Nuxt
* TypeScript
* Vue
* Tailwind CSS
* Convex
* Convex Nuxt integration
* AgentMail
* Firecrawl
* AI SDK
* OpenAI-compatible model provider
* Composio
* Comark
* Google GenAI SDK
* Better Auth
* PostgreSQL
* Lisse / SmoothCorners
* GSAP

The project includes Convex and the Convex Nuxt integration, along with the AgentMail and Firecrawl Convex packages.

The current development inference path uses **Qwen through an OpenAI-compatible API using the AI SDK**.

Convex Agent, Composio, Firecrawl, AgentMail, and Comark form the current foundation for agent execution, research, communication, and assistant rendering.

Better Auth is being used for application authentication and user identity, hosted through the Convex Better Auth component.

## Product Direction

Witness is built around **cases and real-world problems rather than agents**.

A case represents a problem the user is trying to resolve. Agents handle individual tasks within those cases.

Initial areas of application include:

* Insurance
* Property and landlord issues
* Customer complaints
* Billing problems
* Government complaints and reports
* Banking and financial services
* Telecom and internet issues
* Travel and airline problems
* Employment and workplace issues
* Education and administrative processes
* Utilities

The underlying case model is intended to remain generic so Witness can support different types of bureaucratic problems without changing the fundamental product.

---

# Build Log

## September 16, 2026 — Project foundation and application experience

Witness was established as a new application for the Convex All Gas Hackathon.

The initial application foundation uses Nuxt, TypeScript, Vue, Tailwind CSS, and Convex. Convex is configured through `convex-nuxt`.

The project includes the Convex integrations for AgentMail and Firecrawl, establishing the foundation for external communication and web research.

The main Witness application structure was established around the information a person needs while dealing with a real-world problem.

The primary navigation consists of:

* Inbox
* Cases
* Agents
* Vault
* Settings

Cases are the central representation of problems being worked on.

The Inbox is intended to serve as the user's attention center for important case-related communications and other notifications, while the Vault is intended to hold documents, evidence, research, and case results.

The initial agent experience was implemented around a simple problem-first interaction.

Instead of requiring users to understand agents, tools, skills, or technical concepts, Witness focuses the interaction on the user's situation.

The initial experience asks:

> What went wrong?

Users can describe what happened and provide relevant information or documents. Witness is then intended to determine what needs to be done and handle the work behind the scenes.

The agent interaction was expanded with a file attachment entry point so users can provide documents relevant to their situation.

The current interface supports selecting multiple files through the attachment control. File handling is currently prepared for later integration with Convex storage and the case system.

A compact loading-pill interaction was implemented for agent progress.

The interface communicates progress using short, human-readable states rather than exposing internal agent operations.

The product language was shaped around ordinary people dealing with real-life problems and intentionally avoids leading with technical concepts such as agents, tools, skills, orchestration, or enterprise workflows.

Convex is intended to serve as the central realtime backend and state layer for Witness, with planned responsibilities including case persistence, agent state, realtime updates, inbox state, notifications, document metadata and storage, communication state, agent progress, user-action requirements, and asynchronous work.

---

## September 17, 2026 — Agent streaming, model provider foundation, and assistant rendering

The first real server-side agent chat path was implemented.

The frontend sends prompts and conversation history to:

```text
POST /api/agent/chat
```

The Nuxt server route validates the request and returns a Server-Sent Event stream to the client.

The streaming contract was established around:

* `step` events for agent progress
* `delta` events for streamed assistant content
* `tools` events for future tool reporting
* `error` events
* `done` events

The loading pill consumes backend `step` events so its displayed text can reflect the current Witness processing stage instead of relying entirely on local loading animation.

The `useAgentChat` composable was structured around:

* Conversation history
* Streamed assistant responses
* Backend progress steps
* Local fallback progress states
* Request cancellation
* Error handling
* Assistant message accumulation
* Optional future `tools` and `skills` parameters

Tools and skills remain optional in the client request and are not required for the initial chat flow.

The server code was separated into API, agent-service, and provider responsibilities:

```text
server/
├── api/
│   └── agent/
│       └── chat.post.ts
├── services/
│   └── agent/
│       └── chat.ts
└── providers/
    └── openai.ts
```

The first agent service implementation provides the Witness system instructions and streams model output through the OpenAI SDK.

The system instructions establish the initial Witness behavior: understand the user's problem, identify important facts, explain what may be happening, suggest useful next steps, avoid inventing facts or laws, distinguish known information from information requiring verification, and respond using clean readable Markdown.

The current development model is Qwen through an OpenAI-compatible API using the OpenAI SDK.

Bedrock was investigated as an inference provider, but the selected Bedrock model was not available to the current AWS account, so development continues with Qwen while retaining a provider abstraction for future model changes.

The Nuxt development workflow was configured to explicitly load `.env.local`:

```text
nuxt dev --dotenv .env.local
```

The project uses the root-level Nuxt `server/` directory for Nitro server code, with the project's `@@` root alias used for server imports where required by the current setup.

Comark was added for assistant response rendering.

Assistant output is now rendered as Markdown rather than plain text, with dedicated styling for:

* Paragraphs
* Headings
* Ordered and unordered lists
* Nested lists
* Bold and italic text
* Links
* Blockquotes
* Inline code
* Code blocks
* Horizontal rules
* Tables
* Images

Assistant Markdown typography was tuned toward a conversational, ChatGPT-like reading experience, with generous paragraph spacing, comfortable line height, tighter list spacing, and dedicated styling for structured content.

The Markdown styling was corrected so the assistant styles apply globally rather than being restricted to the reduced-motion media query.

The chat user-message bubble was refined to use Lisse's `useSmoothCorners` composable so multiline messages remain correct flex items while retaining smooth-corner rendering.

The repository dependency foundation was expanded to include OpenAI Agents, Composio, Google GenAI, and the Comark Nuxt integration in preparation for the real agent/tooling phase.

---

## September 18, 2026 — Inbox and Settings UI foundations

The Inbox UI skeleton was implemented.

Inbox is now treated as the user's **notification stream**, rather than as a conventional email client. External emails are one type of notification and will eventually be presented in a richer email-like form within the same Inbox.

The initial Inbox layout includes:

* Inbox navigation/header
* Notification list structure
* Compact notification titles
* Single-line truncated previews
* Unread styling
* Clickable notification rows
* Selection controls
* Star controls
* An empty-state presentation for when no notification is selected

The notification list was designed to stay compact and information-dense while preserving a clear distinction between the primary title and the supporting preview.

The initial Inbox filter architecture was explored around a reusable nested filter menu. The intended structure is a filter button in the Inbox navigation that opens filter categories, with individual filter categories opening their selectable options separately.

The filter model is designed to support future notification types such as:

* Emails
* Alerts
* Agent updates
* Case updates

and additional filtering dimensions such as source and status.

The Settings area was established with its own nested layout and sidebar rather than reusing the main Witness navigation as the Settings navigation.

This establishes the foundation for Settings sections including:

* General
* Personalization
* Integrations
* Notifications
* Account

The Settings work establishes the UI foundation for the upcoming personalization and integrations functionality.

The project then moved from the initial UI foundations toward implementing authentication and the core product architecture.

---

## September 19, 2026 — Authentication and user identity foundation

Better Auth was integrated as the application authentication system for the Nuxt/Vue frontend.

The server-side Better Auth configuration was established in the root `lib/auth.ts` module.

Email and password authentication is enabled, with the username plugin included for Witness user identity.

The Better Auth server is configured to use PostgreSQL through the `pg` package and server-side environment variables for the database connection, authentication URL, and secret.

Additional user fields were introduced for the Witness personalization model:

* `country`
* `state`

These are stored as part of the authenticated user profile and are intended to provide trusted location context to the application and future agent runs.

A server-side user creation hook was added to validate geographic availability. The current implementation only allows users in the United States and requires a valid U.S. state value.

The Better Auth client was integrated using the Vue client API, including the username client and inferred additional fields from the server auth configuration.

A Nuxt catch-all authentication route was added at:

```text
server/api/auth/[...all].ts
```

which forwards requests to the Better Auth handler.

This establishes authenticated user identity as the foundation for the next phase of Witness development, where Cases, Agents, Inbox data, integrations, and agent memory can be associated with individual users.

The current location model is intentionally designed to begin with country and state information, with support for additional countries and finer-grained jurisdiction planned for a later stage.

---

## September 20, 2026 — Convex Agent runtime and real-time chat foundation

The Agent chat architecture was migrated from the initial Nuxt server/SSE implementation to the Convex Agent runtime.

Convex Agent is now registered as a Convex component and Witness uses a dedicated Agent instance with the Qwen model through the AI SDK OpenAI-compatible provider.

The Agent chat server implementation now provides:

* Authenticated thread creation
* Thread ownership checks
* Persisted Agent messages through the Convex Agent component
* Asynchronous Agent response generation
* Streamed assistant output
* Realtime stream synchronization with `syncStreams`
* Persisted message loading with `listUIMessages`
* Dedicated thread and message query helpers
* Server-side Qwen provider configuration

A Convex auth plugin was added on the Nuxt side so the Convex client receives the Better Auth JWT and authenticated Convex functions can resolve the current user.

The client chat composable was rebuilt around Convex realtime state rather than an application-managed SSE stream. Active stream metadata is synchronized from Convex, deltas are accumulated locally for responsive rendering, and completed assistant messages are replaced by their persisted records.

Optimistic user-message rendering was added so the user's message appears immediately after send rather than waiting for the first Convex response. Optimistic messages are reconciled against the persisted Agent message order to avoid duplicate rendering.

The root Witness schema was adjusted so Agent message persistence remains owned by the Convex Agent component rather than duplicating the Agent's message storage in a separate application table.

The latest application structure now treats Convex as the source of truth for Agent threads, messages, asynchronous execution, and streaming state.

The product README was also expanded into the current implementation specification, covering the intended Case, Agent, Inbox, Vault, research, Composio, AgentMail, interruption, realtime, personalization, authorization, and sharing systems.

The Agent sidebar now includes a controlled Recent Chats section showing the user's latest conversations. Existing Convex Agent threads can be reopened directly from the sidebar, preserving the persisted conversation history rather than maintaining a second client-side history store.

Recent chats use the existing Agent thread title as their display label, with new conversations initially titled from the user's first prompt for immediate usefulness.

Chat deletion was added with server-side thread authorization and deletion through the Convex Agent runtime. Deleting the currently open conversation returns the user to a new Agent chat.

A lightweight GSAP reveal was added to the Recent Chats section, while the interaction remains intentionally compact. The sidebar is kept limited rather than becoming a full chat archive; richer thread actions such as sharing are reserved for a later overflow menu.

---

## September 21, 2026 — Cases, research tools, and Agent interruptions

The Witness Agent architecture was expanded from a basic persistent chat runtime into a Case-aware work system.

Cases are now the durable representation of real-world problems being resolved. A conversation does not automatically become a Case; Witness can determine whether substantial ongoing work is required and can create or enter a Case when appropriate.

The application Agent and Convex Agent thread are now separate but linked concepts. An Agent handles a task, while the Case persists the broader problem across future conversations and Agent runs.

The Case system now includes:

* Case creation and ownership
* Existing Case lookup and entry
* Case metadata updates
* Case activities
* Case-specific Agent association
* Case status including active, waiting for the user, resolved, and archived
* Structured Case document blocks
* Case widgets for persistent artifacts
* File/document widgets
* Grouping of consecutive widgets into a single widget block

A dedicated Case document experience was added so Case progress can be represented as a living document rather than only a chronological activity log.

The Witness Agent gained Case-management tools for inspecting the current Case, finding related Cases, creating a Case, entering an existing Case, updating Case metadata, recording meaningful activity, and adding structured Case widgets.

Web research support was added through Firecrawl-backed Agent tools for:

* Website mapping
* URL scraping
* Web search

The Agent instructions were updated around the Case model so Witness can distinguish lightweight conversations from problems that require persistent work. The Agent is instructed to reuse an existing Case when the current conversation belongs to it rather than creating duplicate Cases.

The user-interruption architecture was implemented as a first-class application system using the userActions table.

An Agent can now call askUser when it genuinely needs:

* A document
* An answer to a question
* Approval before taking an action

User actions are persisted against the Case and Agent, surfaced through the Inbox as notifications, and represented as Case widgets. Requesting an action changes the Agent to needs_user_action and the Case to waiting_user.

The upload-document interruption is fully implemented. The user can select multiple documents, preview supported images and PDFs, remove selected files, upload them to Convex storage, persist their metadata in the Case, and resume the same Agent thread after submission.

Question interruptions are now implemented with two response paths:

* Select a concise option provided by Witness
* Type a custom answer and send it back to the Agent

The question interface adapts to the prompt and presents selectable answers in a responsive grid, while retaining a free-text answer path.

Approval interruptions are implemented as a binary decision. Witness presents a concise approval request with explicit Allow and Deny controls. Allow resolves the action with an approval response, while Deny continues the Agent with an explicit denial response.

All user-action responses resume the existing Convex Agent thread rather than creating a new conversation. The user's response is persisted as a new Agent message and a new Agent generation is scheduled from that message.

Agent generation now carries the originating message order so stale generations cannot overwrite a newer resumed generation after an interruption. This prevents an earlier generation from incorrectly marking the Agent finished or errored after the user has already responded to an interruption.

The Agent runtime now stops after a successful askUser tool call, allowing control to return to the user without treating the interruption as a finished Agent task.

The chat composable was extended to manage pending user actions, waiting state, upload state, resumed generation state, and dismissal of a resolved interruption while Convex realtime state propagates.

The interruption UI was integrated directly into the Agent chat dock so the normal composer is replaced by the appropriate action surface while Witness waits for the user.

The latest interruption work establishes the foundation for approval-gated external actions. Composio will be used for broader external application/tool execution, while AgentMail will remain the dedicated path for sending emails from Witness's Agent identity. Composio can still be used for operations such as searching and reading connected mailboxes and other supported third-party actions, including workflows where a user chooses to act from their own connected account.

---

## September 22, 2026 — Composio-powered Agent tools

Composio is now integrated into the Witness Agent as a generic external-tool capability rather than as a collection of hardcoded Gmail or Google Drive tools.

The Agent can search the user's connected external applications for the appropriate tool and then execute the discovered tool using the returned schema and arguments.

The Composio runtime is isolated behind a dedicated Convex Node action using `"use node"`, keeping the Node-only Composio SDK outside the default Convex Agent runtime.

Connected integrations are used as the capability boundary. Witness derives the available Composio toolkits from the user's connected integrations and scopes the Composio session accordingly.

The Composio session is persisted per user and reused across tool searches and executions, with its toolkit scope synchronized when the user's connected integrations change.

This allows the same Witness Agent tool surface to work with Gmail, Google Drive, and additional Composio-supported integrations without adding provider-specific tools to the Agent.


## AgentMail inbox provisioning and communication bridge

Witness now provisions a dedicated AgentMail inbox for each authenticated user automatically from the authenticated application shell.

The AgentMail inbox uses the user's Witness username with a Witness-specific suffix and stores the resulting AgentMail inbox ID and address in the application database. Provisioning is idempotent so an existing user's inbox is reused rather than recreated.

An AgentMail webhook is connected to the Convex HTTP endpoint. Incoming `message.received` events are passed into the Witness application through the AgentMail Convex component and mapped into the user's `inboxItems` records.

Inbox email records now retain the external AgentMail message ID and thread ID, allowing Witness to identify the original message when replying.

The Inbox backend now exposes authenticated realtime queries for notification records and unread counts, alongside mutations for read state, starring, and marking notifications as read.

A dedicated Convex Node action was added for outbound email replies. It calls the AgentMail API directly using the application's `AGENTMAIL_API_KEY`, replies to the original AgentMail message, and records the resulting outbound message and thread IDs back into the Witness Inbox/Case state.

The AgentMail communication loop is therefore now represented as:

```text
AgentMail
  ↓
Convex webhook
  ↓
Witness inboxItems
  ↓
Realtime Inbox
  ↓
User reply action
  ↓
AgentMail reply API
```

### Uploaded-document persistence and Case widget layout

The document interruption flow was completed through the persistence layer and verified from the user-facing chat experience.

Uploaded files are persisted in Convex storage with application metadata linked to the originating Agent thread and message order, allowing the chat UI to reconstruct uploaded file widgets after navigation and reload rather than relying on transient client state.

The chat UI now renders persisted uploaded files as file widgets attached to the corresponding user message. Supported images and PDFs can be opened from the chat, while other document types use a compact document representation.

The Case document experience was also refined so document and website widgets share the available Case content width and wrap naturally. Website widgets use fixed-size cards rather than consuming an entire flex row, allowing multiple document and link widgets to remain on the same row until the Case column is actually full.


# Current Architecture Direction

The current application architecture is:

```text
Nuxt 4 / Vue
  ↓
Better Auth
  ↓
Convex client authentication
  ↓
Convex application state + Agent runtime
```

The current Agent path is:

```text
Nuxt frontend
  ↓
useAgentChat()
  ↓
Convex mutation
  ↓
saveMessage()
  ↓
scheduler
  ↓
Convex Agent action
  ↓
witnessAgent.streamText()
  ↓
saveStreamDeltas
  ↓
syncStreams()
  ↓
Convex realtime
  ↓
Witness chat UI
```

The current development model is Qwen through an OpenAI-compatible API using the AI SDK.

The broader application architecture is:

```text
Witness
├── Better Auth
│   └── User identity + profile
│
├── Convex
│   ├── Agent runtime
│   ├── Cases
│   ├── Agents
│   ├── Agent threads
│   ├── Inbox
│   ├── Vault
│   ├── Notifications
│   ├── User actions
│   └── Realtime state
│
├── External services
│   ├── Composio
│   ├── Firecrawl
│   └── AgentMail
│
└── Nuxt frontend
```

Convex is now the source of truth for Agent threads, messages, asynchronous execution, and realtime stream state. Application-specific data such as Cases, Inbox records, user actions, files, and integrations remains in the root Witness schema.
# Planned Core Experience

The target end-to-end flow is:

1. A user authenticates with Witness.
2. The user provides the location information required by the application.
3. A user describes something that went wrong.
4. Witness understands and structures the problem into a case.
5. Relevant information and documents are collected.
6. Witness researches the relevant organization, policy, procedure, or other public information.
7. An agent determines useful next steps.
8. Witness prepares a communication or action for the user.
9. The user approves the proposed action.
10. Witness sends the communication when appropriate.
11. Responses are received and associated with the case.
12. Convex updates the case, inbox, notifications, and agent state in realtime.
13. The agent continues working or asks the user for something it needs.

This flow is intended to become the primary demonstration path for the final hackathon submission.

---

# Convex Usage

Convex is intended to be a central part of Witness rather than simply a database.

Planned Convex responsibilities include:

* Case persistence
* Realtime queries and mutations
* Agent/task state
* Inbox state
* Notifications
* Document storage
* Communication state
* Agent progress
* User-action requirements
* Background and asynchronous work
* Reactive UI updates
* User-specific application state

As these capabilities are implemented, this section should be updated with the concrete Convex features and components actually used by the application.

---

# Hackathon Progress Notes

This log should be updated after each meaningful coding session.

Only substantive progress should be added. Do not create entries for trivial edits or repeated work.

When updating this file:

* Preserve the existing history.
* Add new dated entries rather than rewriting previous entries.
* Use **one entry per calendar date**. Multiple features completed on the same day must be added to that day's existing entry.
* Describe what was actually implemented.
* Do not invent features that have not been built.
* Do not expose secrets, credentials, tokens, private URLs, or unnecessary personal information.
* Prefer concrete implementation details over vague claims.
* When possible, verify progress against the repository and Git history.
* Treat uncommitted local work as unverified until it is pushed or otherwise provided.
* Distinguish current repository state from stale historical or cached repository data.
* Security fixes should only be marked complete after the current public repository state has been checked.

---

# Submission Checklist

* [ ] Core Witness end-to-end experience working
* [x] Authentication foundation implemented
* [x] Convex realtime Agent chat implemented
* [ ] OpenAI integration working
* [x] Firecrawl integration working
* [ ] AgentMail integration working
* [x] Case system implemented
* [x] Agent/task execution implemented
* [x] Composio-powered agent tools implemented
* [x] User-action / interruption flow implemented
* [x] Inbox backend and realtime stream implemented
* [ ] Inbox content/detail view implemented
* [ ] Inbox email reply flow implemented
* [x] Settings integrations implemented
* [ ] Personalization and jurisdiction UI completed
* [ ] Case document widget implemented
* [ ] Additional Case widgets polished
* [ ] Vault file storage and UI implemented
* [ ] Vault / Case file state fully realtime
* [ ] End-to-end Agent → Inbox → user action → resume flow demonstrated
* [ ] Live deployment available
* [x] Public source repository
* [x] `hackathon.md` kept current
* [ ] Demo video completed
* [ ] Final submission completed
