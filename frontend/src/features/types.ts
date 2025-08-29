import { UTxO } from "./WalletHandler"

export type StepType = {
    label: string,
    status: 'success' | 'pending' | 'rejected',
    active: boolean
}

export interface UtxoRetriever {
    getAllUtxos(includeCollateral?: boolean): Promise<UTxO[]>
    getBalance(allUtxos?: UTxO[]): Promise<string>
}