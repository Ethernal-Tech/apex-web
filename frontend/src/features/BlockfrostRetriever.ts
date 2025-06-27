
import { UtxoRetriever } from "./types";
import { getAssetsSumMap } from "../utils/generalUtils";
import { UTxO } from "./WalletHandler";

class BlockfrostRetriever implements UtxoRetriever {
	private address: string;
	private baseUrl: string;
	private dmtrApiKey: string | undefined;

	constructor(address: string, baseUrl: string, dmtrApiKey: string | undefined) {
		this.address = address;
		this.baseUrl = baseUrl;
		this.dmtrApiKey = dmtrApiKey;
	}

	getAllUtxos = async (): Promise<UTxO[]> => {
		let headers: HeadersInit = {'Content-Type': 'application/json'};

		if (this.dmtrApiKey) {
			headers['dmtr-api-key'] = this.dmtrApiKey;
		}

		try {
			const response = await fetch(
				`${this.baseUrl}/addresses/${this.address}/utxos`,
				{ method: 'GET', headers },
			);

			if (!response.ok) {
				throw new Error(`Request failed with status ${response.status}`);
			}

			const data: BlockfrostUtxo[] = await response.json();

			return data.map(toMeshSdkUtxo);
		}
		catch (e) {
			throw new Error(`failed to get blockfrost utxos. e: ${e}`)
		}
	}

	getBalance = async (allUtxos?: UTxO[]): Promise<{ [unit: string]: bigint; }> => {
		if (allUtxos === undefined) {
			allUtxos = await this.getAllUtxos();
		}

		return getAssetsSumMap(allUtxos);
	}
}

export default BlockfrostRetriever;


const toMeshSdkUtxo = (utxo: BlockfrostUtxo): UTxO => ({
	input: { outputIndex: utxo.output_index, txHash: utxo.tx_hash },
	output: {
		address: utxo.address,
		amount: utxo.amount.map(x => ({ unit: x.unit, quantity: x.quantity })),
	},
})

type BlockfrostUtxo = {
	address: string;
	tx_hash: string;
	output_index: number;
	amount: {
		unit: string;
		quantity: string;
	}[];
};