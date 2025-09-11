import { UTxO } from "./WalletHandler"

export type StepType = {
  label: string,
  status: 'success' | 'pending' | 'rejected',
  active: boolean
}

export interface UtxoRetriever {
  getAllUtxos(): Promise<UTxO[]>
  getBalance(allUtxos?: UTxO[]): Promise<{ [unit: string]: bigint }>
}
