import { queryOptions } from "@tanstack/react-query";
import appSettings from "@/settings/appSettings";

/**
 * A bridging transfer prepared on behalf of the user (e.g. by an AI agent
 * through the web-api MCP endpoint), opened via /bridge-app?intent=<id> for the
 * user to review and sign with their own wallet.
 */
export type BridgeIntent = {
  id: string;
  originChain: string;
  destinationChain: string;
  tokenID: number;
  /** Human-readable amount, in the units of the transfer form */
  amount: string;
  destinationAddress: string;
  expiresAt: string;
  txHash?: string;
  state: "awaiting_signature" | "expired" | "submitted";
};

export async function fetchBridgeIntent(id: string): Promise<BridgeIntent> {
  const res = await fetch(
    `${appSettings.apiUrl}/bridgeIntent/${encodeURIComponent(id)}`,
    { headers: { Accept: "application/json" } },
  );
  if (res.status === 404) {
    throw new Error("This bridge request does not exist.");
  }
  if (!res.ok) {
    throw new Error(`Failed to load the bridge request (${res.status})`);
  }

  return (await res.json()) as BridgeIntent;
}

/** Links the signed tx to the intent, so the agent can follow its status. */
export async function submitBridgeIntent(
  id: string,
  txHash: string,
): Promise<void> {
  const res = await fetch(
    `${appSettings.apiUrl}/bridgeIntent/${encodeURIComponent(id)}/submit`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ txHash }),
    },
  );
  if (!res.ok) {
    throw new Error(`Failed to record the bridge request tx (${res.status})`);
  }
}

export const bridgeIntentQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["bridgeIntent", id] as const,
    queryFn: () => fetchBridgeIntent(id),
    retry: false,
    staleTime: Infinity,
  });
