import { BadRequestException, Injectable } from '@nestjs/common';
import {
	Address,
	AuxiliaryData,
	BigNum,
	EnterpriseAddress,
	GeneralTransactionMetadata,
	Int,
	MetadataList,
	MetadataMap,
	PrivateKey,
	Transaction,
	TransactionHash,
	TransactionInput,
	TransactionMetadatum,
	TransactionOutput,
	TransactionWitnessSet,
	Value,
	Vkeywitnesses,
	hash_transaction,
	make_vkey_witness,
} from '@emurgo/cardano-serialization-lib-nodejs';
import {
	createContext,
	getMultisigAddress,
	getSlot,
	getTransactionBuilder,
	getUtxos,
} from 'src/transaction/transaction.helper';
import { createTransactionSubmissionClient } from '@cardano-ogmios/client';
import {
	CreateTransactionDto,
	SignTransactionDto,
	SubmitTransactionDto,
} from './transaction.dto';

@Injectable()
export class TransactionService {
	async createTransaction({
		senderAddress,
		receiverAddress,
		destinationChain,
		originChain,
		amount,
	}: CreateTransactionDto): Promise<Transaction> {
		const txBuilder = await getTransactionBuilder(originChain);

		const fromBech32SenderAddress = Address.from_bech32(senderAddress);
		if (!fromBech32SenderAddress) {
			const error = 'error while creating sender address';
			console.log(error);
			throw new BadRequestException(error);
		}

		const enterpriseAddress = EnterpriseAddress.from_address(
			fromBech32SenderAddress,
		);
		if (!enterpriseAddress) {
			const error = 'error while creating sender enterprise address';
			console.log(error);
			throw new BadRequestException(error);
		}

		const pubKeyHash = enterpriseAddress.payment_cred().to_keyhash();
		if (!pubKeyHash) {
			const error = 'error while creating sender pub key hash';
			console.log(error);
			throw new BadRequestException(error);
		}

		// Add sender inputs
		const utxos = await getUtxos(originChain, senderAddress, amount);

		utxos.forEach((utxo) => {
			txBuilder.add_key_input(
				pubKeyHash,
				TransactionInput.new(
					TransactionHash.from_hex(utxo.transaction.id),
					utxo.index,
				),
				Value.new(BigNum.from_str(utxo.value.ada.lovelace.toString())),
			);
		});

		const auxiliaryData = AuxiliaryData.new();

		const gtm = GeneralTransactionMetadata.new();
		const map = MetadataMap.new();
		map.insert_str('chainId', TransactionMetadatum.new_text(destinationChain));

		const map_t1 = MetadataMap.new();
		map_t1.insert_str(
			'address',
			TransactionMetadatum.new_text(receiverAddress),
		);
		map_t1.insert_str(
			'amount',
			TransactionMetadatum.new_int(Int.from_str(amount.toString())),
		);

		const list = MetadataList.new();
		list.add(TransactionMetadatum.new_map(map_t1));

		map.insert(
			TransactionMetadatum.new_text('transactions'),
			TransactionMetadatum.new_list(list),
		);

		gtm.insert(BigNum.one(), TransactionMetadatum.new_map(map));

		auxiliaryData.set_metadata(gtm);
		txBuilder.set_auxiliary_data(auxiliaryData);

		const bidgingAddress = getMultisigAddress(originChain);
		txBuilder.add_output(
			TransactionOutput.new(
				bidgingAddress,
				Value.new(BigNum.from_str(amount.toString())),
			),
		);

		// Set TTL
		const slot = parseInt(await getSlot(originChain), 10) + 300;
		txBuilder.set_ttl_bignum(BigNum.from_str(slot.toString()));

		txBuilder.add_change_if_needed(fromBech32SenderAddress);

		return Transaction.new(
			txBuilder.build(),
			TransactionWitnessSet.new(),
			auxiliaryData,
		);
	}

	async signTransaction({
		transaction,
		privateKey,
	}: SignTransactionDto): Promise<Transaction> {
		const unsignedTx = Transaction.from_json(transaction);
		const privKey = PrivateKey.from_bech32(privateKey);
		const txBody = unsignedTx.body();
		const txBodyHash = hash_transaction(txBody);

		const vkey_witnesses = Vkeywitnesses.new();
		const vkey_witness = make_vkey_witness(txBodyHash, privKey);
		vkey_witnesses.add(vkey_witness);

		const witness = TransactionWitnessSet.new();
		witness.set_vkeys(vkey_witnesses);

		return Transaction.new(txBody, witness, unsignedTx.auxiliary_data());
	}

	async submitTransaction({
		transaction,
		chain,
	}: SubmitTransactionDto): Promise<string> {
		const tx = Transaction.from_json(transaction);
		const context = await createContext(chain);
		const client = await createTransactionSubmissionClient(context);

		const res = await client.submitTransaction(tx.to_hex());
		client.shutdown();
		return res;
	}
}
