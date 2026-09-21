/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agents_chat from "../agents/chat.js";
import type * as agents_messages from "../agents/messages.js";
import type * as agents_threads from "../agents/threads.js";
import type * as agents_witness from "../agents/witness.js";
import type * as auth from "../auth.js";
import type * as cases_activities from "../cases/activities.js";
import type * as cases_blocks from "../cases/blocks.js";
import type * as cases_create from "../cases/create.js";
import type * as cases_document from "../cases/document.js";
import type * as cases_get from "../cases/get.js";
import type * as cases_list from "../cases/list.js";
import type * as cases_remove from "../cases/remove.js";
import type * as cases_summarize from "../cases/summarize.js";
import type * as cases_update from "../cases/update.js";
import type * as cases_widgets from "../cases/widgets.js";
import type * as http from "../http.js";
import type * as providers_qwen from "../providers/qwen.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "agents/chat": typeof agents_chat;
  "agents/messages": typeof agents_messages;
  "agents/threads": typeof agents_threads;
  "agents/witness": typeof agents_witness;
  auth: typeof auth;
  "cases/activities": typeof cases_activities;
  "cases/blocks": typeof cases_blocks;
  "cases/create": typeof cases_create;
  "cases/document": typeof cases_document;
  "cases/get": typeof cases_get;
  "cases/list": typeof cases_list;
  "cases/remove": typeof cases_remove;
  "cases/summarize": typeof cases_summarize;
  "cases/update": typeof cases_update;
  "cases/widgets": typeof cases_widgets;
  http: typeof http;
  "providers/qwen": typeof providers_qwen;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  betterAuth: import("../betterAuth/_generated/component.js").ComponentApi<"betterAuth">;
};
