
import { UtxoRetriever } from "./types";
import { getAssetsSumMap } from "../utils/generalUtils";
import { UTxO } from "./WalletHandler";

type JsonRpcRequest = {
	jsonrpc: '2.0';
	method: string;
	params: {
		addresses?: string[];
	};
	id: number | string;
};

type OgmiosUtxo = {
	transaction: {
		id: string;
	},
	index: number;
	address: string;
	value: {
		[key: string]: {
			[key: string]: number
		},
	};
	datumHash?: string;
	datum?: string;
	script?: any;
};

type UtxoResponse = {
	jsonrpc: '2.0';
	method: string;
	result: OgmiosUtxo[];
	id: number | string;
};

class OgmiosRetriever implements UtxoRetriever {
	private address: string;
	private baseUrl: string;

	constructor(address: string, baseUrl: string) {
		this.address = address;
		this.baseUrl = baseUrl;
	}

	getAllUtxos = async (): Promise<UTxO[]> => {
		const requestBody: JsonRpcRequest = {
			jsonrpc: '2.0',
			method: 'queryLedgerState/utxo',
			params: {
				addresses: [this.address]
			},
			id: 1,
		};

		try {
			const response = await fetch(this.baseUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody),
			});

			if (!response.ok) {
				throw new Error(`Request failed with status ${response.status}`);
			}

			const data: UtxoResponse = await response.json();

			if ('error' in data) {
				throw new Error(`Ogmios returned error: ${JSON.stringify(data.error)}`);
			}

			return data.result.map(toMeshSdkUtxo);
		}
		catch (e) {
			throw new Error(`failed to query ogmios for utxos. e: ${e}`)
		}
	}

	getBalance = async (allUtxos?: UTxO[]): Promise<{ [unit: string]: bigint; }> => {
		if (allUtxos === undefined) {
			allUtxos = await this.getAllUtxos();
		}

		return getAssetsSumMap(allUtxos);
	}
}

export default OgmiosRetriever;


const toMeshSdkUtxo = (utxo: OgmiosUtxo): UTxO => ({
	input: { outputIndex: utxo.index, txHash: utxo.transaction.id || '' },
	output: {
		address: utxo.address,
		amount: Object.entries(utxo.value).map(([key, value]) => {
			const innerKey = Object.keys(value)[0];
			const innerValue = Object.values(value)[0];

			if (key === 'ada') {
				return {
					unit: 'lovelace',
					quantity: innerValue.toString(),
				};
			}

			return {
				unit: key + innerKey,
				quantity: innerValue.toString(),
			};
		}),
	},
})
