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
* OpenAI

The project includes Convex and the Convex Nuxt integration, along with the AgentMail and Firecrawl Convex packages.

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

## September 16, 2026 — Project foundation

Witness was established as a new application for the Convex All Gas Hackathon.

The initial application foundation uses Nuxt, TypeScript, Vue, Tailwind CSS, and Convex. Convex is configured through `convex-nuxt`.

The project also includes the Convex integrations for AgentMail and Firecrawl, establishing the foundation for external communication and web research.

## September 16, 2026 — Application structure

The main Witness application structure was established around the information a person needs while dealing with a real-world problem.

The primary navigation consists of:

* Inbox
* Cases
* Agents
* Vault
* Settings

Cases are the central representation of problems being worked on.

The Inbox is intended for important case-related communications, while the Vault is intended to hold documents, evidence, research, and case results.

## September 16, 2026 — Agent experience

The initial agent experience was implemented around a simple problem-first interaction.

Instead of requiring users to understand agents, tools, skills, or technical concepts, Witness focuses the interaction on the user's situation.

The initial experience asks:

> What went wrong?

Users can describe what happened and provide relevant information or documents. Witness is then intended to determine what needs to be done and handle the work behind the scenes.

## September 16, 2026 — File attachments

The agent interaction was expanded with a file attachment entry point so users can provide documents relevant to their situation.

The current interface supports selecting multiple files through the attachment control. The file handling flow is currently being prepared for integration with Convex storage and the case system.

## September 16, 2026 — Agent progress experience

A compact loading-pill interaction was implemented for agent progress.

The interface communicates progress using short, human-readable states rather than exposing internal agent operations.

Examples include:

* Looking into what happened…
* Finding out what you can do…
* Checking the details…
* Putting together your next steps…
* Working on it…
* Getting things moving…

The goal is for the user to understand that Witness is actively working without needing to understand how the underlying agent operates.

## September 16, 2026 — Product language

The initial user-facing language was shaped around ordinary people dealing with real-life problems.

The product intentionally avoids leading with technical concepts such as agents, tools, skills, orchestration, or enterprise workflows.

The experience is centered on the user's problem and the outcome they are trying to reach.

## September 16, 2026 — Current architecture direction

Convex is intended to serve as the central realtime backend and state layer for Witness.

Planned responsibilities include:

* Case persistence
* Agent and task state
* Realtime case updates
* Inbox state
* Notifications
* Document metadata and storage
* Communication state
* Agent progress
* User-action requirements
* Background and asynchronous work
* Reactive UI updates

AgentMail is intended to handle external case-related email communication.

Firecrawl is intended to research relevant company, government, policy, procedural, and other public information.

OpenAI is intended to provide the reasoning and agent intelligence used to understand cases, research information, determine useful next steps, and prepare communications.

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
* Describe what was actually implemented.
* Do not invent features that have not been built.
* Do not expose secrets, credentials, tokens, private URLs, or unnecessary personal information.
* Prefer concrete implementation details over vague claims.
* When possible, verify progress against the repository and Git history.

---

# Submission Checklist

* [ ] Core Witness experience working
* [ ] Convex realtime functionality demonstrated
* [ ] OpenAI integration working
* [ ] Firecrawl integration working
* [ ] AgentMail integration working
* [ ] Case system implemented
* [ ] Agent/task execution implemented
* [ ] User-action flow implemented
* [ ] Inbox implemented
* [ ] Vault implemented
* [ ] Live deployment available
* [ ] Public source repository
* [ ] `hackathon.md` kept current
* [ ] Demo video completed
* [ ] Final submission completed
