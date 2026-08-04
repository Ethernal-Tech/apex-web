import appSettings from "@/settings/appSettings";
import {
  SolanaNetworkType,
  SolanaNetworkTypeMap,
} from "@/lib/wallet/address/types";

type JsonRpcResponse<T> = {
  result?: T;
  error?: { message?: string; code?: number };
};

function getRpcUrl(useMainnet?: boolean): string {
  const isMainnet = useMainnet ?? appSettings.isMainnet;
  const rpcUrl =
    SolanaNetworkTypeMap[
      isMainnet
        ? SolanaNetworkType.MainNetNetwork
        : SolanaNetworkType.TestNetNetwork
    ];
  if (!rpcUrl) {
    throw new Error("Missing Solana RPC URL for selected network.");
  }
  return rpcUrl;
}

async function solanaRpcCall<T>(
  method: string,
  params: unknown[],
  useMainnet?: boolean,
): Promise<T> {
  const response = await fetch(getRpcUrl(useMainnet), {
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

export async function getBalanceLamports(
  address: string,
  useMainnet?: boolean,
): Promise<bigint> {
  const result = await solanaRpcCall<{ value: number }>(
    "getBalance",
    [address, { commitment: "confirmed" }],
    useMainnet,
  );
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
  useMainnet?: boolean,
): Promise<Record<string, bigint>> {
  const result = await solanaRpcCall<{ value: ParsedTokenAccount[] }>(
    "getTokenAccountsByOwner",
    [
      ownerAddress,
      { programId: SPL_TOKEN_PROGRAM_ID },
      { encoding: "jsonParsed", commitment: "confirmed" },
    ],
    useMainnet,
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
