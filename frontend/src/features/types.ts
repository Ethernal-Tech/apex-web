import { LockedTokensDto } from '../swagger/apexBridgeApiService';
import { UTxO } from './WalletHandler';

export type StepType = {
	label: string;
	status: 'success' | 'pending' | 'rejected';
	active: boolean;
};

export interface UtxoRetriever {
	getAllUtxos(includeCollateral?: boolean): Promise<UTxO[]>;
	getBalance(allUtxos?: UTxO[]): Promise<{ [unit: string]: bigint }>;
}

export type TotalLockedLZ = {
	decimals: number;
	symbol: string;
	raw: bigint;
};

export type LockedTokens = {
	lockedTokens: LockedTokensDto;
	layerZeroLockedTokens: bigint;
};
