// ============================================
// TEMPLATE PLUGIN CLIENT
// Typed client wrapper for target apps
// ============================================
//
// This module provides typed client wrappers for the template plugin.
// It depends only on the SDK transport interface and shared contracts.
//
// IMPORTANT: This entrypoint is for TARGET APPS only.
// - Do NOT import proxy code here
// - Do NOT use Node-only APIs
// - Keep dependencies minimal
//
// Usage:
// ```ts
// import { template } from "@glueco/plugin-template/client";
// import { GatewayClient } from "@glueco/sdk";
//
// const client = new GatewayClient({ ... });
// const transport = await client.getTransport();
// const templateClient = template(transport);
//
// const response = await templateClient.actionOne({
//   input: "hello world"
// });
// ```
// ============================================

import type {
  GatewayTransport,
  GatewayResponse,
  GatewayRequestOptions,
} from "@glueco/sdk";

import {
  type ActionOneRequest,
  type ActionOneResponse,
  type ActionTwoRequest,
  type ActionTwoResponse,
  PLUGIN_ID,
} from "./contracts";

// Re-export contracts for consumer convenience
export * from "./contracts";

// ============================================
// CLIENT TYPES
// ============================================

/**
 * Options for plugin requests.
 */
export interface TemplateRequestOptions extends Omit<
  GatewayRequestOptions,
  "stream" | "method"
> {}

/**
 * Template client interface.
 * Provides typed methods for all supported actions.
 */
export interface TemplateClient {
  /**
   * Execute action.one
   *
   * @param request - Action one request
   * @param options - Optional request options
   * @returns Action one response
   *
   * @example
   * ```ts
   * const response = await templateClient.actionOne({
   *   input: "hello world",
   *   config: { option1: true }
   * });
   * console.log(response.data.result);
   * ```
   */
  actionOne(
    request: ActionOneRequest,
    options?: TemplateRequestOptions,
  ): Promise<GatewayResponse<ActionOneResponse>>;

  /**
   * Execute action.two
   *
   * @param request - Action two request
   * @param options - Optional request options
   * @returns Action two response
   *
   * @example
   * ```ts
   * const response = await templateClient.actionTwo({
   *   data: ["item1", "item2"],
   *   options: { limit: 10, format: "json" }
   * });
   * console.log(response.data.items);
   * ```
   */
  actionTwo(
    request: ActionTwoRequest,
    options?: TemplateRequestOptions,
  ): Promise<GatewayResponse<ActionTwoResponse>>;

  /**
   * Get the underlying transport for advanced usage.
   */
  readonly transport: GatewayTransport;
}

// ============================================
// CLIENT FACTORY
// ============================================

/**
 * Create a typed template client.
 *
 * This factory function creates a client instance that wraps the
 * SDK transport with typed methods for each plugin action.
 *
 * @param transport - Gateway transport from SDK
 * @returns Typed template client
 *
 * @example
 * ```ts
 * import { template } from "@glueco/plugin-template/client";
 * import { GatewayClient, FileKeyStorage, FileConfigStorage } from "@glueco/sdk";
 *
 * // Setup gateway client
 * const gatewayClient = new GatewayClient({
 *   keyStorage: new FileKeyStorage('./.gateway/keys.json'),
 *   configStorage: new FileConfigStorage('./.gateway/config.json'),
 * });
 *
 * // Get transport and create typed client
 * const transport = await gatewayClient.getTransport();
 * const templateClient = template(transport);
 *
 * // Use with full type safety and autocomplete
 * const response = await templateClient.actionOne({
 *   input: "hello world"
 * });
 *
 * // TypeScript knows response.data is ActionOneResponse
 * console.log(response.data.result);
 * console.log(response.data.metadata.processingTime);
 * ```
 */
export function template(transport: GatewayTransport): TemplateClient {
  return {
    transport,

    async actionOne(
      request: ActionOneRequest,
      options?: TemplateRequestOptions,
    ): Promise<GatewayResponse<ActionOneResponse>> {
      return transport.request<ActionOneResponse, ActionOneRequest>(
        PLUGIN_ID,
        "action.one",
        request,
        options,
      );
    },

    async actionTwo(
      request: ActionTwoRequest,
      options?: TemplateRequestOptions,
    ): Promise<GatewayResponse<ActionTwoResponse>> {
      return transport.request<ActionTwoResponse, ActionTwoRequest>(
        PLUGIN_ID,
        "action.two",
        request,
        options,
      );
    },
  };
}

// Default export for convenient importing
export default template;
