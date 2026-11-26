import appSettings from "@/settings/appSettings";

export type SolanaTxStatus = "pending" | "confirmed" | "failed" | "expired";

export type SolanaTxStatusResponse = {
  status: SolanaTxStatus;
  /** execution error reported by the node, set only when failed */
  err?: string;
};

export async function fetchSolanaTxStatus(params: {
  chain: string;
  signature: string;
  lastValidBlockHeight: string;
}): Promise<SolanaTxStatusResponse> {
  const search = new URLSearchParams(params);

  const res = await fetch(
    `${appSettings.apiUrl}/transaction/solanaTxStatus?${search}`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      body || `Failed to load Solana transaction status (${res.status})`,
    );
  }
  return res.json() as Promise<SolanaTxStatusResponse>;
}
