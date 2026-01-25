/**
 * Discovery API client for fetching available resources from proxy.
 */

export interface DiscoveryResource {
  resourceId: string;
  actions: string[];
  auth: {
    pop: {
      version: number;
    };
  };
  constraints?: {
    supports: string[];
  };
}

export interface DiscoveryResponse {
  gateway: {
    version: string;
    name?: string;
  };
  resources: DiscoveryResource[];
}

/**
 * Fetch available resources from the proxy discovery endpoint.
 */
export async function fetchDiscovery(
  proxyUrl: string,
): Promise<DiscoveryResponse> {
  const url = `${proxyUrl}/api/resources`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Discovery failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

/**
 * Parse resource ID into type and provider.
 */
export function parseResourceId(resourceId: string): {
  resourceType: string;
  provider: string;
} {
  const [resourceType, provider] = resourceId.split(":");
  return { resourceType, provider };
}

/**
 * Get unique resource types from discovery response.
 */
export function getResourceTypes(discovery: DiscoveryResponse): string[] {
  const types = new Set<string>();
  for (const resource of discovery.resources) {
    const { resourceType } = parseResourceId(resource.resourceId);
    types.add(resourceType);
  }
  return Array.from(types).sort();
}

/**
 * Get providers for a resource type from discovery response.
 */
export function getProvidersForType(
  discovery: DiscoveryResponse,
  resourceType: string,
): string[] {
  const providers: string[] = [];
  for (const resource of discovery.resources) {
    const parsed = parseResourceId(resource.resourceId);
    if (parsed.resourceType === resourceType) {
      providers.push(parsed.provider);
    }
  }
  return providers.sort();
}

/**
 * Get actions for a specific resource.
 */
export function getActionsForResource(
  discovery: DiscoveryResponse,
  resourceType: string,
  provider: string,
): string[] {
  const resourceId = `${resourceType}:${provider}`;
  const resource = discovery.resources.find((r) => r.resourceId === resourceId);
  return resource?.actions || [];
}

/**
 * Check if a resource exists in the discovery response.
 */
export function hasResource(
  discovery: DiscoveryResponse,
  resourceType: string,
  provider: string,
): boolean {
  const resourceId = `${resourceType}:${provider}`;
  return discovery.resources.some((r) => r.resourceId === resourceId);
}
