import { GatewayRequestOptions, GatewayResponse, GatewayTransport } from '@glueco/sdk';
import { ActionOneRequest, ActionOneResponse, ActionTwoRequest, ActionTwoResponse } from './contracts.mjs';
export { ACTIONS, ActionOneRequestSchema, ActionOneResponseSchema, ActionTwoRequestSchema, ActionTwoResponseSchema, DEFAULT_API_URL, ENFORCEMENT_SUPPORT, NAME, PLUGIN_ID, PROVIDER, RESOURCE_TYPE, TemplateAction, VERSION } from './contracts.mjs';
import 'zod';

/**
 * Options for plugin requests.
 */
interface TemplateRequestOptions extends Omit<GatewayRequestOptions, "stream" | "method"> {
}
/**
 * Template client interface.
 * Provides typed methods for all supported actions.
 */
interface TemplateClient {
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
    actionOne(request: ActionOneRequest, options?: TemplateRequestOptions): Promise<GatewayResponse<ActionOneResponse>>;
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
    actionTwo(request: ActionTwoRequest, options?: TemplateRequestOptions): Promise<GatewayResponse<ActionTwoResponse>>;
    /**
     * Get the underlying transport for advanced usage.
     */
    readonly transport: GatewayTransport;
}
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
declare function template(transport: GatewayTransport): TemplateClient;

export { ActionOneRequest, ActionOneResponse, ActionTwoRequest, ActionTwoResponse, type TemplateClient, type TemplateRequestOptions, template as default, template };
