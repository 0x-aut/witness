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
import type * as cases_create from "../cases/create.js";
import type * as cases_get from "../cases/get.js";
import type * as cases_list from "../cases/list.js";
import type * as cases_update from "../cases/update.js";
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
  "cases/create": typeof cases_create;
  "cases/get": typeof cases_get;
  "cases/list": typeof cases_list;
  "cases/update": typeof cases_update;
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
