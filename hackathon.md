# Convex All Gas Hackathon — Build Log

## Project

**Witness**

Witness helps people deal with bureaucratic problems by understanding what happened, organizing the relevant information, figuring out what they can do next, and helping move the situation toward resolution.

## Hackathon

**Event:** Convex All Gas Hackathon

## Frontend

**Frontend:** Undecided

The application is being built with Nuxt and TypeScript. Final hosting will be selected between Convex static hosting and ChatGPT Sites before submission.

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
* OpenAI SDK
* OpenAI Agents SDK
* Composio
* Comark
* Google GenAI SDK
* Better Auth
* PostgreSQL
* Lisse / SmoothCorners
* GSAP

The project includes Convex and the Convex Nuxt integration, along with the AgentMail and Firecrawl Convex packages.

The current development inference path uses **Qwen through an OpenAI-compatible API using the OpenAI SDK**.

OpenAI Agents, Composio, Google GenAI, and Comark are also included as part of the foundation for the upcoming agent and integration work.

Better Auth is being used for application authentication and user identity, with PostgreSQL as its current database.

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

# Current Architecture Direction

The current authentication and application direction is:

```text
Nuxt / Vue
  ↓
Better Auth
  ↓
Authenticated user
  ↓
Convex / application state
```

The current agent path is:

```text
Nuxt frontend
  ↓
useAgentChat()
  ↓
POST /api/agent/chat
  ↓
server/services/agent/chat.ts
  ↓
server/providers/openai.ts
  ↓
OpenAI-compatible model provider
  ↓
streamed step + delta events
  ↓
Witness chat UI
```

The broader intended architecture is:

```text
Witness
├── Better Auth
│   └── User identity + profile
│
├── Convex
│   ├── Cases
│   ├── Agents
│   ├── Inbox
│   ├── Vault
│   ├── Notifications
│   └── Realtime state
│
├── Agent runtime
│   ├── Model provider
│   ├── OpenAI Agents
│   ├── Composio
│   ├── Firecrawl
│   └── AgentMail
│
└── Nuxt frontend
```

The model provider, agent runtime, application state, and authentication layers are intentionally kept separate so each can evolve without restructuring the entire application.

---

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

* [ ] Core Witness experience working
* [x] Authentication foundation implemented
* [ ] Convex realtime functionality demonstrated
* [ ] OpenAI integration working
* [ ] Firecrawl integration working
* [ ] AgentMail integration working
* [ ] Case system implemented
* [ ] Agent/task execution implemented
* [ ] Composio-powered agent tools implemented
* [ ] User-action flow implemented
* [ ] Inbox backend implemented
* [ ] Inbox content/detail view implemented
* [ ] Inbox email integration implemented
* [ ] Settings integrations implemented
* [ ] Personalization and jurisdiction implemented
* [ ] Vault implemented
* [ ] Live deployment available
* [ ] Public source repository
* [ ] `hackathon.md` kept current
* [ ] Demo video completed
* [ ] Final submission completed
