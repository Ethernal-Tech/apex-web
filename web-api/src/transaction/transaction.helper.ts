import {
	Address,
	BigNum,
	LinearFee,
	TransactionBuilder,
	TransactionBuilderConfigBuilder,
} from '@emurgo/cardano-serialization-lib-nodejs';
import { Utxo } from '@cardano-ogmios/schema/dist';
import {
	createLedgerStateQueryClient,
	createTransactionSubmissionClient,
} from '@cardano-ogmios/client';
import { createInteractionContext } from '@cardano-ogmios/client';
import { UtxoByAddresses } from '@cardano-ogmios/schema/dist';
import { Transaction } from '@emurgo/cardano-serialization-lib-nodejs';
import { ChainEnum } from 'src/common/enum';

export async function getTransactionBuilder(chain: ChainEnum) {
	const protocolParams = await getProtocolParameters(chain);

	const linearFee = LinearFee.new(
		BigNum.from_str(protocolParams.minFeeCoefficient.toString()),
		BigNum.from_str(protocolParams.minFeeConstant.ada.lovelace.toString()),
	);

	if (!protocolParams.maxValueSize || !protocolParams.maxTransactionSize) {
		console.error(
			'Error in maxValueSize = ' +
				protocolParams.maxValueSize +
				', maxTransactionSize = ',
			protocolParams.maxTransactionSize,
		);
	}
	const max_value_size =
		protocolParams.maxValueSize !== undefined
			? protocolParams.maxValueSize.bytes
			: 0;
	const max_tx_size =
		protocolParams.maxTransactionSize !== undefined
			? protocolParams.maxTransactionSize.bytes
			: 0;

	const cfg = TransactionBuilderConfigBuilder.new()
		.fee_algo(linearFee)
		.pool_deposit(
			BigNum.from_str(protocolParams.stakePoolDeposit.ada.lovelace.toString()),
		)
		.key_deposit(
			BigNum.from_str(
				protocolParams.stakeCredentialDeposit.ada.lovelace.toString(),
			),
		)
		.max_value_size(max_value_size)
		.max_tx_size(max_tx_size)
		.coins_per_utxo_byte(
			BigNum.from_str(protocolParams.minUtxoDepositCoefficient.toString()),
		)
		.build();

	return TransactionBuilder.new(cfg);
}

export async function getUtxos(
	chain: ChainEnum,
	address: string,
	amount: number,
) {
	const utxos = await getUTXOsFromAddress(chain, address);

	const potentialFee = process.env.POTENTIAL_FEE
		? parseInt(process.env.POTENTIAL_FEE, 10)
		: 0;
	const minUtxoValue = 1000000;

	let retVal: Utxo = [];
	let token_amount: number;
	let amount_sum: number = 0;

	for (let index = 0; index < utxos.length; index++) {
		token_amount = parseInt(utxos[index].value.ada.lovelace.toString(), 10);
		if (token_amount >= amount + potentialFee + minUtxoValue) {
			amount_sum = token_amount;
			retVal = [utxos[index]];
			break;
		}

		amount_sum += token_amount;
		retVal.push(utxos[index]);

		if (amount_sum >= amount + potentialFee + minUtxoValue) break;
	}

	if (amount_sum < amount + potentialFee + minUtxoValue) {
		console.error(
			'no enough avaialble funds for generating transaction ' +
				amount_sum +
				' available but ' +
				(amount + potentialFee + minUtxoValue) +
				' needed.',
		);
	}

	return retVal;
}

export function getMultisigAddress(chain: ChainEnum) {
	let address: string = '';
	if (chain === ChainEnum.Prime) {
		address = process.env.MULTISIG_ADDRESS_PRIME!;
	} else if (chain === ChainEnum.Vector) {
		address = process.env.MULTISIG_ADDRESS_VECTOR!;
	}

	return Address.from_bech32(address);
}

export async function getBalanceOfAddress(chain: ChainEnum, address: string) {
	const utxos = await getUTXOsFromAddress(chain, address);

	let balance = 0;
	utxos.forEach((utxo) => {
		balance += parseInt(utxo.value.ada.lovelace.toString(), 10);
	});

	return balance;
}

export const createContext = (chain: ChainEnum) => {
	let host, port;

	// Set host and port based on chainId
	if (chain === ChainEnum.Prime) {
		host = process.env.OGMIOS_NODE_ADDRESS_PRIME;
		port = parseInt(process.env.OGMIOS_NODE_PORT_PRIME!, 10) || undefined;
	} else if (chain === ChainEnum.Vector) {
		host = process.env.OGMIOS_NODE_ADDRESS_VECTOR;
		port = parseInt(process.env.OGMIOS_NODE_PORT_VECTOR!, 10) || undefined;
	} else {
		// Default values if chain doesn't match any condition
		host = 'localhost';
		port = 1337;
	}

	return createInteractionContext(
		(err) => console.error(err),
		() => console.log('Connection closed.'),
		{ connection: { host, port } },
	);
};

export async function getSlot(chain: ChainEnum) {
	const context = await createContext(chain);
	const client = await createLedgerStateQueryClient(context);

	const tip = await client.networkTip();
	const retVal = (tip as any).slot;

	client.shutdown();

	return retVal;
}

export async function getProtocolParameters(chain: ChainEnum) {
	const context = await createContext(chain);
	const client = await createLedgerStateQueryClient(context);

	const protocolParameters = await client.protocolParameters();

	client.shutdown();

	return protocolParameters;
}

export async function getUTXOsFromAddress(chain: ChainEnum, address: string) {
	const context = await createContext(chain);
	const client = await createLedgerStateQueryClient(context);

	const filter: UtxoByAddresses = {
		addresses: [address],
	};
	const utxos = await client.utxo(filter);

	client.shutdown();

	return utxos;
}

export async function submitTransaction(
	chain: ChainEnum,
	transaction: Transaction,
) {
	const context = await createContext(chain);
	const client = await createTransactionSubmissionClient(context);

	const res = await client.submitTransaction(transaction.to_hex());

	client.shutdown();

	return res;
}
