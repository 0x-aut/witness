# Convex All Gas Hackathon — Build Log

## Project

**Witness**

Witness is an application for fighting bureaucracy. It helps people deal with real-world problems involving organizations and institutions by helping them understand what happened, figure out what they can do next, gather the relevant information, and work toward resolution.

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

- Nuxt
- TypeScript
- Vue
- Tailwind CSS
- Convex
- Convex Nuxt integration
- AgentMail
- Firecrawl
- OpenAI

The repository currently includes Convex and the Convex Nuxt integration, as well as the AgentMail and Firecrawl Convex packages.

## Product Direction

Witness is being built around **cases/problems rather than agents**.

A case represents a real-world problem the user is trying to resolve. Agents are workers that operate on tasks within those cases.

Initial areas of application include:

- Insurance
- Property and landlord issues
- Customer complaints
- Billing problems
- Government complaints and reports
- Banking and financial services
- Telecom and internet issues
- Travel and airline problems
- Employment and workplace issues
- Education and administrative processes
- Utilities

The underlying case model is intended to remain generic so additional bureaucratic situations can be supported without changing the fundamental product.

---

# Build Log

## September 16, 2026 — Project foundation

Witness was established as a new project for the Convex All Gas Hackathon.

The repository currently contains a Nuxt application with Convex integration configured through `convex-nuxt`. The project also includes the Convex integrations for AgentMail and Firecrawl, establishing the intended foundation for the hackathon's external-service requirements.

The initial application structure and visual system were adapted from an earlier agent application, while the product direction was changed substantially around Witness and its real-world problem-resolution use case.

## September 16, 2026 — Application structure

The main application layout and page structure were ported and adapted for Witness.

The navigation was reshaped around the user's problems and the information Witness needs to manage:

- Inbox
- Cases
- Agents
- Vault
- Settings

Cases are intended to become the primary persistent representation of a user's real-world problems.

The Inbox will contain important case-related communications, while the Vault will hold documents, evidence, research, and case results.

## September 16, 2026 — Agent experience

The agent interaction experience was ported and adapted from the previous application's `useAgentChat` flow.

The Witness experience is being intentionally presented around **what happened to the user**, rather than asking the user to think about agents, tools, skills, or other technical concepts.

The initial interaction is centered around the problem itself, with the agent handling the work behind the scenes.

## September 16, 2026 — Agent creation interaction

The agent interface was simplified for the Witness use case.

The previous Tools and Skills picker experience was removed from the primary interaction. The interface instead focuses on:

- describing what happened
- allowing the user to attach relevant files
- showing the agent's progress
- allowing the user to continue interacting with the task

The loading state was refined into a compact pill-based interaction that communicates progress without exposing unnecessary technical implementation details.

## September 16, 2026 — User-facing language

The initial Witness experience was rewritten to speak to ordinary people dealing with real-life problems rather than developers or enterprise users.

The primary direction is:

> What went wrong?

The surrounding copy is intended to make the product feel like a place where someone can bring a problem and get help moving it toward resolution, rather than a generic AI agent interface.

## September 16, 2026 — Current architecture direction

The intended architecture is centered around Convex as the application's realtime backend and state layer.

The planned system will use Convex to manage persistent case state, agent state, communications, documents, notifications, and realtime updates.

AgentMail is intended to handle external case-related email communication.

Firecrawl is intended to allow Witness agents to research relevant company, government, policy, procedural, and other public information.

OpenAI will provide the reasoning and agent intelligence used to understand cases, research information, determine next steps, and prepare communications.

---

# Planned Core Experience

The target end-to-end flow is:

1. A user describes something that went wrong.
2. Witness understands and structures the problem into a case.
3. Relevant information and documents are collected.
4. Witness researches the relevant organization, policy, procedure, or other public information.
5. An agent determines useful next steps.
6. Witness prepares a communication or action for the user.
7. The user can approve the proposed action.
8. Witness sends the communication when appropriate.
9. Responses are received and associated with the case.
10. Convex updates the case, inbox, notifications, and agent state in realtime.
11. The agent continues working or asks the user for something it needs.

This flow is the intended demonstration path for the final hackathon submission.

---

# Convex Usage

Convex is intended to be a central part of Witness rather than simply a database.

Planned Convex responsibilities include:

- Case persistence
- Agent/task state
- Realtime case updates
- Inbox state
- Notifications
- Document metadata and storage
- Communication state
- Agent progress
- User-action requirements
- Background/async work
- Reactive UI updates

As these capabilities are implemented, this section should be updated with the concrete Convex features and components actually used by the application.

---

# Hackathon Progress Notes

This log should be updated after each meaningful coding session.

Only substantive progress should be added. Do not create entries for trivial edits or repeated work.

When updating this file:

- Preserve the existing history.
- Add new dated entries rather than rewriting previous entries.
- Describe what was actually implemented.
- Do not invent features that have not been built.
- Do not expose secrets, credentials, tokens, private URLs, or unnecessary personal information.
- Prefer concrete implementation details over vague claims.
- When possible, verify progress against the repository and Git history.

---

# Submission Checklist

- [ ] Core Witness experience working
- [ ] Convex realtime functionality demonstrated
- [ ] OpenAI integration working
- [ ] Firecrawl integration working
- [ ] AgentMail integration working
- [ ] Case system implemented
- [ ] Agent/task execution implemented
- [ ] User-action flow implemented
- [ ] Inbox implemented
- [ ] Vault implemented
- [ ] Live deployment available
- [ ] Public source repository
- [ ] `hackathon.md` kept current
- [ ] Demo video completed
- [ ] Final submission completed