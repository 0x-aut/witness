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

**Stage:** Early development

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

The current repository includes the Convex Nuxt integration, AgentMail and Firecrawl Convex packages, Comark's Nuxt integration, Composio integrations, OpenAI Agents, Google GenAI, and the OpenAI SDK.

The current development inference provider is **Qwen through an OpenAI-compatible API using the OpenAI SDK**. Bedrock was investigated as an inference provider but GPT-5.6 Sol was not available to the current AWS account, so it is not currently the active development provider.

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

The Inbox is intended for important case-related communications, while the Vault is intended to hold documents, evidence, research, and case results.

The initial agent experience was implemented around a simple problem-first interaction.

Instead of requiring users to understand agents, tools, skills, or technical concepts, Witness focuses the interaction on the user's situation.

The initial experience asks:

> What went wrong?

Users can describe what happened and provide relevant information or documents. Witness is then intended to determine what needs to be done and handle the work behind the scenes.

The agent interaction was expanded with a file attachment entry point so users can provide documents relevant to their situation.

The current interface supports selecting multiple files through the attachment control. File handling is currently prepared for later integration with Convex storage and the case system.

A compact loading-pill interaction was implemented for agent progress.

The interface communicates progress using short, human-readable states rather than exposing internal agent operations.

Examples include:

* Looking into what happened…
* Finding out what you can do…
* Checking the details…
* Putting together your next steps…
* Working on it…
* Getting things moving…

The product language was shaped around ordinary people dealing with real-life problems and intentionally avoids leading with technical concepts such as agents, tools, skills, orchestration, or enterprise workflows.

Convex is intended to serve as the central realtime backend and state layer for Witness, with planned responsibilities including case persistence, agent state, realtime updates, inbox state, notifications, document metadata and storage, communication state, agent progress, user-action requirements, and asynchronous work.

---

## September 17, 2026 — Agent streaming, provider setup, Comark, and agent tooling foundation

The first real server-side agent chat path was implemented.

The frontend now sends prompts and conversation history to:

```text
POST /api/agent/chat
```

The Nuxt server route validates the request and streams Server-Sent Events back to the client.

The streaming contract was established around:

* `step` events for agent progress
* `delta` events for streamed assistant content
* `tools` events for future tool reporting
* `error` events
* `done` events

The Witness loading pill is now designed to consume backend `step` events so its displayed text can represent what the agent is actually doing rather than relying entirely on local loading animation.

The `useAgentChat` composable was cleaned up around the streaming contract and now handles:

* Conversation history
* Streamed assistant responses
* Backend progress steps
* Local fallback progress states
* Request cancellation
* Error handling
* Assistant message accumulation
* Optional future `tools` and `skills` parameters

Tools and skills remain optional and are currently not sent as part of the basic request flow because the initial goal is to establish the core agent response path first.

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

The agent service contains the initial Witness system prompt and streams model output through the OpenAI SDK.

The current system prompt instructs the model to:

* Understand the user's real-world problem
* Identify important facts
* Explain what may be happening
* Suggest useful next steps
* Avoid inventing laws, policies, facts, or deadlines
* Distinguish known information from information requiring verification
* Respond in clean Markdown
* Use natural paragraph spacing
* Use restrained headings and lists
* Avoid raw HTML and code output

The current development model is Qwen through an OpenAI-compatible API using the OpenAI SDK. This is being used to validate the streaming agent experience while keeping the provider boundary independent of the frontend.

Bedrock was evaluated as an alternative inference provider. GPT-5.6 Sol was not available to the current AWS account despite the Bedrock model being documented, so the development path was switched to Qwen while preserving the provider abstraction for future model changes.

The Nuxt development workflow was configured to explicitly load `.env.local`:

```text
nuxt dev --dotenv .env.local
```

Nuxt runtime configuration was prepared for server-side provider configuration, with Bedrock values represented through runtime config rather than exposed client-side configuration.

The project uses the root-level Nuxt `server/` directory for Nitro server code. Root-level imports for server files use the `@@` alias where required by the current project structure.

Comark was added as the Markdown renderer for assistant responses.

Assistant responses are now intended to render as structured Markdown rather than plain text, including:

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

A dedicated `assistant-markdown` styling system was added to create a conversational, ChatGPT-like reading rhythm.

Paragraphs were given larger separation and comfortable line height, while list items were intentionally kept tighter so lists do not look excessively spaced.

The Markdown styling was moved into the normal global stylesheet rather than remaining inside the reduced-motion media query, ensuring the assistant formatting applies normally while reduced-motion preferences remain limited to animation behavior.

The chat user-message bubble was refined to use Lisse's `useSmoothCorners` approach so multiline user messages remain proper flex items while retaining smooth-corner rendering.

Composio and OpenAI Agents dependencies are now present in the repository as preparation for the next agent phase. The actual Composio-powered agent execution loop has not yet been implemented.

Google GenAI is also present as an available provider dependency for future experimentation, but Qwen through the OpenAI SDK is the current development inference path.

---

# Current Architecture Direction

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

The model provider, agent runtime, and application state layers are intentionally kept separate so inference providers and agent tooling can evolve without restructuring the core Witness application.

---

# Planned Core Experience

The target end-to-end flow is:

1. A user describes something that went wrong.
2. Witness understands and structures the problem into a case.
3. Relevant information and documents are collected.
4. Witness researches the relevant organization, policy, procedure, or other public information.
5. An agent determines useful next steps.
6. Witness prepares a communication or action for the user.
7. The user approves the proposed action.
8. Witness sends the communication when appropriate.
9. Responses are received and associated with the case.
10. Convex updates the case, inbox, notifications, and agent state in realtime.
11. The agent continues working or asks the user for something it needs.

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
* Security fixes should only be marked complete after the current public repository has been checked.

---

# Submission Checklist

* [ ] Core Witness experience working
* [ ] Convex realtime functionality demonstrated
* [ ] OpenAI integration working
* [ ] Firecrawl integration working
* [ ] AgentMail integration working
* [ ] Case system implemented
* [ ] Agent/task execution implemented
* [ ] Composio-powered agent tools implemented
* [ ] User-action flow implemented
* [ ] Inbox implemented
* [ ] Vault implemented
* [ ] Jurisdiction context implemented
* [ ] Live deployment available
* [ ] Public source repository
* [ ] All exposed credentials removed and revoked
* [ ] `hackathon.md` kept current
* [ ] Demo video completed
* [ ] Final submission completed
