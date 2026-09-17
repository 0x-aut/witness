Yes. That gives us a clean priority order for today:

1. **Agent execution first**

   * User submits “What went wrong?”
   * Create the Case/Agent.
   * Send the prompt + relevant context to the backend.
   * Agent actually reasons and returns useful information.
   * Get the basic agent lifecycle working.

2. **Composio**

   * Install it properly.
   * Establish the user connection model.
   * Start with email as the first meaningful integration.
   * Make sure the architecture works with Convex rather than creating unnecessary backend infrastructure.

3. **Inbox frontend + agent**

   * Build the Witness Inbox experience.
   * Connect it conceptually to cases/agents.
   * Eventually surface incoming email and agent-prepared responses.

4. **Settings → Integrations**

   * Explore what integrations actually make sense for Witness.
   * Then build the connection UI around the useful ones rather than blindly exposing a giant app directory.

5. **Jurisdiction**

   * Country onboarding: **US, UK, Canada**.
   * Country becomes user context and is changeable from Settings.
   * State/province is requested by the agent only when relevant.
   * County/local jurisdiction can come later when genuinely necessary.

And yes, **jurisdiction should wait**. It is important for accuracy, but it isn't the thing that proves Witness's core thesis. The thing we need to prove first is:

> **Tell Witness what happened → Witness understands the problem → an agent actually does useful work → the result becomes part of an ongoing case.**
