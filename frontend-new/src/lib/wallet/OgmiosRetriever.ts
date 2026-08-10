import { getAssetsSumMap, type SimpleUtxo } from "@/lib/cardano/utxoMinValue";
import { LovelaceTokenName } from "@/lib/tokens";
import { captureAndThrowError } from "@/lib/wallet/errors";
import type { UtxoRetriever } from "@/lib/wallet/utxoRetriever";

type JsonRpcRequest = {
  jsonrpc: "2.0";
  method: string;
  params: {
    addresses?: string[];
  };
  id: number | string;
};

type OgmiosUtxo = {
  transaction: {
    id: string;
  };
  index: number;
  address: string;
  value: {
    [key: string]: {
      [key: string]: number;
    };
  };
  datumHash?: string;
  datum?: string;
  script?: unknown;
};

type UtxoResponse = {
  jsonrpc: "2.0";
  method: string;
  result: OgmiosUtxo[];
  id: number | string;
  error?: unknown;
};

class OgmiosRetriever implements UtxoRetriever {
  private address: string;
  private baseUrl: string;

  constructor(address: string, baseUrl: string) {
    this.address = address;
    this.baseUrl = baseUrl;
  }

  getAllUtxos = async (): Promise<SimpleUtxo[]> => {
    const requestBody: JsonRpcRequest = {
      jsonrpc: "2.0",
      method: "queryLedgerState/utxo",
      params: {
        addresses: [this.address],
      },
      id: 1,
    };

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        captureAndThrowError(
          `Request failed with status ${response.status}`,
          "OgmiosRetriever.ts",
          "getAllUtxos",
        );
      }

      const data: UtxoResponse = await response.json();

      if ("error" in data && data.error) {
        captureAndThrowError(
          `Ogmios returned error: ${JSON.stringify(data.error)}`,
          "OgmiosRetriever.ts",
          "getAllUtxos",
        );
      }

      return data.result.map(toMeshSdkUtxo);
    } catch (e) {
      captureAndThrowError(
        `failed to query ogmios for utxos. e: ${e}`,
        "OgmiosRetriever.ts",
        "getAllUtxos",
      );
    }
  };

  getBalance = async (
    allUtxos?: SimpleUtxo[],
  ): Promise<{ [unit: string]: bigint }> => {
    if (allUtxos === undefined) {
      allUtxos = await this.getAllUtxos();
    }

    return getAssetsSumMap(allUtxos);
  };
}

export default OgmiosRetriever;

const toMeshSdkUtxo = (utxo: OgmiosUtxo): SimpleUtxo => ({
  input: { outputIndex: utxo.index, txHash: utxo.transaction.id || "" },
  output: {
    address: utxo.address,
    amount: Object.entries(utxo.value).map(([key, value]) => {
      const innerKey = Object.keys(value)[0];
      const innerValue = Object.values(value)[0];

      if (key === "ada") {
        return {
          unit: LovelaceTokenName,
          quantity: innerValue.toString(),
        };
      }

      return {
        unit: key + innerKey,
        quantity: innerValue.toString(),
      };
    }),
  },
});
