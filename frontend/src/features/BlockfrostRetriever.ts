import { UtxoRetriever } from './types';
import { captureAndThrowError, getAssetsSumMap } from '../utils/generalUtils';
import { UTxO } from './WalletHandler';

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

	getAllUtxos = async (): Promise<UTxO[]> => {
		const headers: HeadersInit = { 'Content-Type': 'application/json' };

		if (this.dmtrApiKey) {
			headers['dmtr-api-key'] = this.dmtrApiKey;
		}

		try {
			const response = await fetch(
				`${this.baseUrl}/addresses/${this.address}/utxos`,
				{ method: 'GET', headers },
			);

			if (!response.ok) {
				captureAndThrowError(
					`Request failed with status ${response.status}`,
					'BlockfrostRetriever.ts',
					'getAllUtxos',
				);
			}

			const data: BlockfrostUtxo[] = await response.json();

			return data.map(toMeshSdkUtxo);
		} catch (e) {
			captureAndThrowError(
				`failed to get blockfrost utxos. e: ${e}`,
				'BlockfrostRetriever.ts',
				'getAllUtxos',
			);
		}
	};

	getBalance = async (allUtxos?: UTxO[]): Promise<string> => {
		if (allUtxos === undefined) {
			allUtxos = await this.getAllUtxos();
		}

		const assetsSumMap = getAssetsSumMap(allUtxos);
		return (assetsSumMap['lovelace'] || BigInt(0)).toString(10);
	};
}

export default BlockfrostRetriever;

const toMeshSdkUtxo = (utxo: BlockfrostUtxo): UTxO => ({
	input: { outputIndex: utxo.output_index, txHash: utxo.tx_hash },
	output: {
		address: utxo.address,
		amount: utxo.amount.map((x) => ({
			unit: x.unit,
			quantity: x.quantity,
		})),
	},
});

type BlockfrostUtxo = {
	address: string;
	tx_hash: string;
	output_index: number;
	amount: {
		unit: string;
		quantity: string;
	}[];
};
