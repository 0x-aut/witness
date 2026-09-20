# Witness

> A personal agent for dealing with the bureaucratic problems of everyday life.

Witness helps people deal with situations that are frustrating, confusing, time-consuming, or difficult to navigate alone.

A user explains what happened in plain language. Witness understands the situation, creates or finds the relevant Case, researches what can be done, gathers information, performs actions through connected services, asks the user for anything it cannot obtain itself, and keeps the entire situation organized until it is resolved.

Witness is intentionally broad. It can handle things such as:

* Insurance disputes
* Healthcare and medical billing
* Landlord/property issues
* Utility and phone bills
* Customer complaints
* Refunds and cancellations
* Government complaints/reports
* Travel problems
* Subscription issues
* Financial/billing disputes
* Other bureaucratic or administrative problems

The user should not need to understand which department, process, form, policy, or institution is responsible. They explain the problem. Witness figures out how to work on it.

---

# Product Model

Witness has four primary surfaces:

| Surface    | Purpose                                                    |
| ---------- | ---------------------------------------------------------- |
| **Agents** | Talk to Witness and give it work                           |
| **Cases**  | The persistent workspace for a real-life problem           |
| **Inbox**  | Things that require the user's attention                   |
| **Vault**  | Important information and documents Witness may need again |

The mental model is:

```text
Agents = Intelligence
Cases  = Work
Inbox  = Attention
Vault  = Memory
```

The application should remain simple for normal users.

Witness may perform many operations internally, but the user should primarily see:

1. What is happening
2. What Witness discovered
3. What Witness accomplished
4. What Witness needs from them
5. What happens next

Internal tool calls, execution logs, implementation details, and unnecessary intermediate events should not overwhelm the interface.

---

# Core User Flow

```text
User describes a problem
        ↓
Witness understands the problem
        ↓
Find relevant existing Case
        │
        ├── Existing Case → continue working on it
        │
        └── No Case → create Case
                         ↓
                    Agent works
                         ↓
              ┌──────────┴──────────┐
              │                     │
          Can continue          Needs user
              │                     │
              │                     ▼
              │                  Inbox
              │                     │
              │               User responds
              │                     │
              └──────────┬──────────┘
                         ↓
                   Agent resumes
                         ↓
                   Case progresses
                         ↓
                      Result
                         ↓
                    Resolution
```

The system should support this flow without requiring the user to manually manage every step.

---

# 1. Agent Chat

The Agent surface is the conversational interface to Witness.

## Required

* Start a new Agent conversation
* Persistent Agent threads
* Stream Agent responses
* Persist user and assistant messages
* Reopen previous conversations
* Continue an existing conversation
* Maintain conversation context
* Associate conversations with Cases
* Agent progress/loading state
* Error state
* Retry failed responses
* Agent tool execution
* Agent-generated actions
* Agent interruptions
* Agent resumption after user action

## Recent Chats

The Agent sidebar may contain a small, controlled list of recent conversations.

Initial implementation:

* Show approximately 3–5 recent chats
* Short generated titles
* Clicking opens the existing thread
* Show active/loading state where useful
* New Chat action
* Optional "View all" later

Do not turn the sidebar into an enormous chat archive.

Cases may eventually appear in navigation as well, but the Agent surface should remain primarily about conversations.

---

# 2. Convex Agent Runtime

Witness uses Convex Agent as the persistent Agent runtime.

## Required

* Persistent Agent threads
* Persistent messages
* Asynchronous Agent generation
* Streaming responses
* Agent context
* Tool calls
* Agent memory
* Agent-to-Case association
* Resuming existing threads
* Server-side Agent execution

Current architecture:

```text
Nuxt/Vue
   ↓
Convex mutation
   ↓
saveMessage()
   ↓
scheduler
   ↓
Agent action
   ↓
witnessAgent.streamText()
   ↓
saveStreamDeltas
   ↓
Convex realtime query
   ↓
Vue UI
```

The client should not implement its own parallel conversation history or SSE system.

Convex should be the source of truth.

---

# 3. Agent Memory

Witness needs persistent memory so that users do not repeatedly explain the same situation.

## Conversation Memory

Remember the Agent conversation.

## Case Memory

Remember information discovered while working on a Case.

Examples:

* Relevant organizations
* Reference numbers
* Important dates
* Policies
* Previous communications
* Decisions
* Results
* Outstanding tasks

## User Memory

Store stable information that is genuinely useful across Cases.

Memory must be controlled and relevant rather than storing everything indiscriminately.

---

# 4. Cases

A Case represents a real-world problem the user is dealing with.

Examples:

```text
Insurance denied my claim
Landlord hasn't returned my deposit
Wrong charge on my phone bill
Airline hasn't refunded my ticket
```

## Required

* Create Case
* Agent-created Case
* Find existing Case
* Search Cases
* Case ownership
* Case title
* Case description
* Case status
* Case history
* Case activity
* Case documents
* Case communications
* Case actions
* Case Agent/thread relationship
* Case result/outcome
* Archive Case
* Close Case
* Reopen Case

## Case Status

Initial states:

```text
Active
Waiting for you
Waiting on someone else
Resolved
Closed
```

---

# 5. Case Page

The Case page is NOT another Agent chat.

The Agent page answers:

> "What do I want to tell Witness?"

The Case page answers:

> "What's happening with this problem?"

The Case page should therefore be case-centric rather than conversation-centric.

## Case page should contain

* Case title
* Short summary
* Current status
* Current next step
* Important information
* Agent activity
* Research findings
* Relevant documents
* Communications
* User actions
* Persistent useful information/widgets
* Case history
* Participants
* Share Case

The Case page should remain calm and selective.

Do not expose every internal Agent event.

---

# 6. Case Activity

Create a user-facing activity history.

Example:

```text
Today

Witness found your insurer's appeal deadline.
2:41 PM

You uploaded your denial letter.
2:36 PM

Witness contacted the claims department.
2:31 PM

Case created.
2:24 PM
```

Activity should describe meaningful outcomes, not internal execution.

Do NOT show:

```text
Calling tool...
LLM generated...
Parsing response...
Running step...
Tool returned...
```

Those belong in internal observability/debugging.

---

# 7. Case Information / Widgets

Witness should be able to turn important information into persistent Case objects.

Widgets are not meant to make the Case look like a dashboard.

Only create a widget when the information is useful enough to keep.

Initial widget types:

* Link/source
* Research finding
* Email
* Document
* Task/action
* Question
* Approval
* Result
* Important note

Later:

* Bill
* Subscription
* Transaction
* Appointment
* Claim
* Policy
* Deadline
* Contact

Conceptually:

```text
Agent discovers something
        ↓
Is it useful later?
        │
        ├── No → keep in conversation/activity
        │
        └── Yes → create persistent Case object
```

---

# 8. Research

Witness must be able to research a user's problem.

## Required

* Web research
* Firecrawl integration
* Extract information from relevant websites
* Identify useful sources
* Summarize findings
* Save useful sources to Case
* Link/source widgets
* Research activity

The UI should show the result rather than exposing the underlying tool implementation.

Example:

```text
Appeal deadline

Your insurer's published policy allows appeals
within 180 days of the denial.

Source
[Insurance policy]
```

---

# 9. Composio / Connected Services

Witness needs to move beyond research and actually perform work.

## Initial integration

Start with Gmail.

The Agent should be able to:

* Search Gmail
* Find relevant messages
* Read relevant emails
* Draft emails
* Send emails when authorized
* Associate emails with Cases
* Use information from emails while working

Later integrations can include:

* Google Drive
* Calendar
* Other services exposed through Composio

Tool access must be server-side and authorized.

---

# 10. Agent Actions

Witness should perform meaningful actions rather than simply recommend them.

Examples:

```text
Find the company's cancellation policy
Search my email for the original receipt
Draft a complaint
Send an email
Find my previous correspondence
Research the appeal process
Check whether this charge appears elsewhere
```

Actions should have state.

```text
Pending
Running
Needs user
Completed
Failed
```

The Case should know what actions have happened.

---

# 11. User Action / Interruption System

This is a core Witness feature.

The Agent must be able to stop when it needs something only the user can provide.

Examples:

```text
I need your policy number to continue.

Upload the denial letter.

Would you like me to send this email?

Which of these two charges are incorrect?

Connect your Gmail account to continue.
```

## Required

* Agent creates user action
* Agent pauses
* Action associated with Case
* Action appears in Inbox
* Action appears in Case
* User completes action
* Action marked completed
* Agent resumes
* Case updates

## Initial action types

* Question
* File upload
* Approval
* Confirmation
* Choice
* Connect integration
* Provide information

Later:

* Signature
* Identity verification
* Payment confirmation
* Phone-call workflow
* External web interaction

---

# 12. Inbox

Inbox is the user's attention layer.

It answers:

> "What needs my attention?"

Inbox should not become another activity dump.

## Notification types

* Agent needs information
* Agent finished work
* Case update
* Important email
* External response
* Action completed
* Approval request
* Important/urgent event

## Required

* Notification list
* Read/unread state
* Selection
* Star/favorite
* Open notification
* Notification detail
* Case association
* Mark read
* Relevant filtering

Potential filters:

```text
All
Emails
Alerts
Agent updates
Case updates
Actions
```

---

# 13. AgentMail

AgentMail becomes part of Witness's communication system.

## Required

* Agent sends email
* Email associated with Case
* Receive external response
* Associate response with Case
* Show relevant response in Inbox
* Store communication history
* Trigger Agent continuation when appropriate

Flow:

```text
Agent needs external information
        ↓
AgentMail sends message
        ↓
Third party responds
        ↓
Witness receives response
        ↓
Case updates
        ↓
Agent continues
```

---

# 14. Email Approval Flow

For sensitive actions, Witness should not automatically send messages by default.

Initial flow:

```text
Agent drafts response
       ↓
Inbox
       ↓
User reviews
       ↓
Send
```

Provide:

* Agent's proposed response
* Send proposed response
* Use my email
* Cancel/edit where appropriate

Later, after explicit user trust/settings:

* Automatic sending for permitted classes of actions

---

# 15. Vault

Vault is Witness's persistent information store.

## Required

* Upload documents
* View documents
* Associate documents with Cases
* Save important files
* Save useful research
* Retrieve relevant information
* Search Vault

Later:

* Document extraction
* Document classification
* Document summaries
* Automatically identify useful Case documents

---

# 16. Sharing Cases

Witness should allow users to share individual Cases.

The Case is the unit of collaboration.

Not:

> "Share my Witness account."

Instead:

> "Share this problem with someone."

## Required later/initial lightweight version

* Generate Case share
* Viewer access
* Collaborator access
* Shared Case visibility
* Case updates sync in realtime

Potential later features:

* Comments
* Shared documents
* Shared actions
* Presence
* Collaborative Agent interaction

Do not create a separate social network or "Social" section.

---

# 17. Realtime / Convex Live

Convex should be visibly important to the product.

Realtime should power:

* Agent streaming
* Case changes
* Case activity
* Inbox notifications
* User actions
* Widget creation
* Email arrival
* Agent status
* Action completion
* Case status
* Shared Case updates
* Presence when sharing is implemented

The desired behavior:

```text
Something changes
       ↓
Convex updates
       ↓
Relevant UI changes immediately
```

A Case opened in two browser windows should visibly remain synchronized.

---

# 18. Personalization

Keep onboarding simple.

## Required

* Country
* State/province when relevant
* User preferences
* Communication preferences
* Agent preferences

Current initial jurisdiction support:

```text
United States
```

The architecture should allow additional countries later.

Do not ask users for detailed jurisdiction information unless the Case actually requires it.

---

# 19. Integrations Settings

Settings → Integrations.

Initial:

* Gmail
* Google Drive
* Composio-connected services

Each integration should display:

* Connected/disconnected
* What Witness can access
* Connect
* Disconnect
* Reconnect

---

# 20. Notifications Settings

Settings → Notifications.

Controls for:

* Agent updates
* Case updates
* Emails
* User actions
* Important events

Later:

* Email notifications
* Push notifications
* Notification frequency

---

# 21. General / Account Settings

Settings should contain:

```text
General
Personalization
Integrations
Notifications
Account
```

Account functionality:

* Profile
* Email
* Password/authentication
* Connected accounts
* Sign out
* Account deletion later

---

# 22. Authentication / Identity

Better Auth is hosted through the Convex Better Auth component.

Required:

* Sign up
* Sign in
* Sign out
* Session handling
* Authenticated Convex requests
* User identity
* Country/state fields
* Server-side authorization

Authenticated identity must always be derived server-side.

Do not trust user IDs supplied by the browser.

---

# 23. Authorization

Every persistent object must have an ownership/access model.

Protect:

* Agent threads
* Messages
* Cases
* Documents
* Inbox notifications
* User actions
* Integrations
* Shared Cases

A user must only be able to access their own data unless a Case has explicitly been shared.

---

# 24. Product UX Principles

Witness should feel:

* Calm
* Intelligent
* Trustworthy
* Useful
* Human
* Focused

It should NOT feel like:

* An enterprise dashboard
* A developer console
* A social network
* A productivity suite
* A giant database

Complexity belongs in the system.

Simplicity belongs in the interface.

The user should rarely need to understand:

* Which Agent was used
* Which tool was called
* Which API was called
* Which research system was used
* Which internal step is running

They should understand:

> **What happened, what Witness did, what I need to do, and what happens next.**

---

# 25. Visual / Component System

Use the existing Witness visual language.

* Nuxt 4
* TypeScript
* Tailwind
* Lucide icons
* GSAP/v-gsap where useful
* Lisse SmoothCorners for rounded UI
* Comark for Agent Markdown

Use:

```vue
<SmoothCorners>
```

for normal rounded UI.

Use `useSmoothCorners` when the component needs the actual DOM element to participate in flex/layout behavior.

Avoid native `border-radius` unless the Lisse implementation creates a demonstrated technical problem.

---

# 26. Architecture

Current high-level structure:

```text
Nuxt
│
├── Agent UI
├── Inbox UI
├── Cases UI
├── Vault UI
└── Settings UI
        │
        ▼
     Convex
        │
        ├── Better Auth
        ├── Convex Agent
        ├── Cases
        ├── Agents
        ├── Inbox
        ├── User Actions
        ├── Documents
        ├── Notifications
        └── Sharing
        │
        ├── Qwen / AI SDK
        ├── Composio
        ├── Firecrawl
        └── AgentMail
```

The frontend should not contain business-critical authorization or Agent orchestration.

Convex should own:

* Persistent state
* Agent threads
* Agent execution
* Authorization
* Case relationships
* User actions
* Realtime synchronization
* Background work

---

# 27. Core Data Model

The system will ultimately need relationships around:

```text
User
 │
 ├── Cases
 │    ├── Agent Thread
 │    ├── Activities
 │    ├── Documents
 │    ├── Communications
 │    ├── Actions
 │    ├── Widgets
 │    └── Participants
 │
 ├── Agent Threads
 │
 ├── Inbox Notifications
 │
 ├── Vault Documents
 │
 └── Integrations
```

The Case is the central product object.

---

# 28. Ship Order

Do not build everything simultaneously.

## Phase 1 — Agent foundation

* Persistent Agent thread
* Convex Agent
* Qwen provider
* Persistent messages
* Real streaming
* Reopen thread
* Recent chats
* Agent loading/error states

## Phase 2 — Cases

* Case schema
* Case creation
* Case queries/mutations
* Agent Case tools
* Case ↔ Agent thread
* Case status
* Case page
* Case activity

## Phase 3 — Real Agent work

* Composio
* Gmail
* Firecrawl
* Research
* Tool execution
* Action state
* Case activity from Agent work

## Phase 4 — User interruptions

* User actions
* Questions
* Upload requests
* Approvals
* Inbox notifications
* Agent pause/resume

## Phase 5 — Communication

* AgentMail
* Outbound email
* Incoming email
* Case association
* Inbox email UI
* Approval/send flow

## Phase 6 — Persistent information

* Vault
* Case documents
* Research widgets
* Email widgets
* Result widgets
* Useful persistent Case information

## Phase 7 — Realtime / collaboration

* Case realtime updates
* Shared Cases
* Viewer/collaborator access
* Realtime activity
* Live Case synchronization

## Phase 8 — Polish

* Recent chats
* Case search/filtering
* Settings integrations
* Notification settings
* Personalization
* Empty states
* Loading states
* Error handling
* Mobile/responsive behavior
* Animation
* Accessibility

---

# Definition of "Shipped"

Witness is considered functionally shipped when this scenario works end-to-end:

```text
1. User signs in.

2. User tells Witness:
   "My insurance company denied my claim."

3. Witness creates a Case.

4. Witness creates/persists an Agent thread.

5. Witness researches the situation.

6. Witness finds relevant information.

7. Witness stores useful findings in the Case.

8. Witness searches the user's connected services when needed.

9. Witness determines that it needs something from the user.

10. Witness pauses.

11. User sees the request in Inbox.

12. User uploads/provides the information.

13. Witness resumes automatically.

14. Witness performs the next action.

15. Witness sends an email when authorized.

16. A response arrives through AgentMail.

17. Witness associates the response with the Case.

18. The Case updates in realtime.

19. Witness determines the next step.

20. The user can leave the application and return later.

21. The Case and Agent conversation are still there.

22. The user can understand what happened without
    reading the entire Agent conversation.
```

That is the core Witness experience.

---

# Tonight's Priority

The priority is **working product depth, not feature-count theater**.

The minimum critical chain is:

```text
Agent
  ↓
Case
  ↓
Agent work
  ↓
User interruption
  ↓
Inbox
  ↓
AgentMail
  ↓
Agent resumes
  ↓
Case updates
```

Everything else should support that chain.

The most important demonstration should be that Witness doesn't merely answer questions.

**Witness takes responsibility for a problem, works on it over time, involves the user only when necessary, and keeps the entire situation organized until there is an outcome.**
