import { getAssetsSumMap, type SimpleUtxo } from "@/lib/cardano/utxoMinValue";
import { captureAndThrowError } from "@/lib/wallet/errors";
import type { UtxoRetriever } from "@/lib/wallet/utxoRetriever";

type BlockfrostUtxo = {
  address: string;
  tx_hash: string;
  output_index: number;
  amount: {
    unit: string;
    quantity: string;
  }[];
};

class BlockfrostRetriever implements UtxoRetriever {
  private address: string;
  private baseUrl: string;
  private dmtrApiKey: string | undefined;

  constructor(
    address: string,
    baseUrl: string,
    dmtrApiKey: string | undefined,
  ) {
    this.address = address;
    this.baseUrl = baseUrl;
    this.dmtrApiKey = dmtrApiKey;
  }

  getAllUtxos = async (): Promise<SimpleUtxo[]> => {
    const headers: HeadersInit = { "Content-Type": "application/json" };

    if (this.dmtrApiKey) {
      headers["dmtr-api-key"] = this.dmtrApiKey;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/addresses/${this.address}/utxos`,
        { method: "GET", headers },
      );

      if (!response.ok) {
        captureAndThrowError(
          `Request failed with status ${response.status}`,
          "BlockfrostRetriever.ts",
          "getAllUtxos",
        );
      }

      const data: BlockfrostUtxo[] = await response.json();

      return data.map(toMeshSdkUtxo);
    } catch (e) {
      captureAndThrowError(
        `failed to get blockfrost utxos. e: ${e}`,
        "BlockfrostRetriever.ts",
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

export default BlockfrostRetriever;

const toMeshSdkUtxo = (utxo: BlockfrostUtxo): SimpleUtxo => ({
  input: { outputIndex: utxo.output_index, txHash: utxo.tx_hash },
  output: {
    address: utxo.address,
    amount: utxo.amount.map((x) => ({
      unit: x.unit,
      quantity: x.quantity,
    })),
  },
});
