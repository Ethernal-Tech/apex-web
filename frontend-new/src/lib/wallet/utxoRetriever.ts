import type { SimpleUtxo } from "@/lib/cardano/utxoMinValue";

export type { SimpleUtxo as UTxO };

export interface UtxoRetriever {
  getAllUtxos(includeCollateral?: boolean): Promise<SimpleUtxo[]>;
  getBalance(allUtxos?: SimpleUtxo[]): Promise<{ [unit: string]: bigint }>;
}
