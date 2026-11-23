import appSettings from "@/settings/appSettings";

type JsonRpcResponse<T> = {
  result?: T;
  error?: { message?: string; code?: number };
};

// web-api forwards to its SOLANA_RPC_URL: public nodes reject browser-origin requests with 403
async function solanaRpcCall<T>(method: string, params: unknown[]): Promise<T> {
  const response = await fetch(`${appSettings.apiUrl}/solanaRpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`Solana RPC HTTP ${response.status}`);
  }

  const json = (await response.json()) as JsonRpcResponse<T>;
  if (json.error) {
    throw new Error(json.error.message ?? "Solana RPC error");
  }
  if (json.result === undefined) {
    throw new Error("Solana RPC returned no result");
  }
  return json.result;
}

export async function getBalanceLamports(address: string): Promise<bigint> {
  const result = await solanaRpcCall<{ value: number }>("getBalance", [
    address,
    { commitment: "confirmed" },
  ]);
  return BigInt(result.value);
}

const SPL_TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

type ParsedTokenAccount = {
  account: {
    data: {
      parsed?: {
        info?: {
          mint?: string;
          tokenAmount?: { amount?: string };
        };
      };
    };
  };
};

export async function getSplTokenBalancesByMintLamports(
  ownerAddress: string,
): Promise<Record<string, bigint>> {
  const result = await solanaRpcCall<{ value: ParsedTokenAccount[] }>(
    "getTokenAccountsByOwner",
    [
      ownerAddress,
      { programId: SPL_TOKEN_PROGRAM_ID },
      { encoding: "jsonParsed", commitment: "confirmed" },
    ],
  );

  const balances: Record<string, bigint> = {};
  for (const { account } of result.value) {
    const info = account.data?.parsed?.info;
    const mint = info?.mint;
    const amount = info?.tokenAmount?.amount;
    if (!mint || !amount) continue;
    const lamports = BigInt(amount);
    balances[mint] = (balances[mint] ?? BigInt(0)) + lamports;
  }
  return balances;
}

export async function getFeeForMessageLamports(
  messageBase64: string,
): Promise<bigint> {
  const result = await solanaRpcCall<{ value: number | null }>(
    "getFeeForMessage",
    [messageBase64, { commitment: "confirmed" }],
  );

  if (result.value == null) {
    throw new Error("Solana fee estimation returned no value.");
  }

  return BigInt(result.value);
}

export async function sendRawTransactionBase64(
  transactionBase64: string,
): Promise<string> {
  return solanaRpcCall<string>("sendTransaction", [
    transactionBase64,
    {
      encoding: "base64",
      skipPreflight: false,
      preflightCommitment: "confirmed",
    },
  ]);
}

export async function confirmTransactionSignature(
  signature: string,
  timeoutMs = 60_000,
): Promise<void> {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const result = await solanaRpcCall<{
      value: Array<{
        confirmationStatus?: string;
        err: unknown;
      } | null>;
    }>("getSignatureStatuses", [
      [signature],
      { searchTransactionHistory: true },
    ]);

    const status = result.value[0];
    if (status?.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
    }

    if (
      status?.confirmationStatus === "confirmed" ||
      status?.confirmationStatus === "finalized"
    ) {
      return;
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  throw new Error(`Timed out waiting for Solana confirmation: ${signature}`);
}
