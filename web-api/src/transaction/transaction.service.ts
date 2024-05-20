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
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { ChainEnum, TransactionStatusEnum } from 'src/common/enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { splitStringIntoChunks } from 'src/utils/stringUtils';

@Injectable()
export class TransactionService {
	constructor(
		@InjectRepository(BridgeTransaction)
		private readonly bridgeTransactionRepository: Repository<BridgeTransaction>,
	) {}
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

		const map_t1 = MetadataMap.new();
		const receiverAddressList = MetadataList.new();
		const chunkedReceiverAddresses = splitStringIntoChunks(receiverAddress);
		chunkedReceiverAddresses.forEach((chunk) => {
			receiverAddressList.add(TransactionMetadatum.new_text(chunk));
		});
		map_t1.insert(
			TransactionMetadatum.new_text('a'),
			TransactionMetadatum.new_list(receiverAddressList),
		);
		map_t1.insert_str(
			'm',
			TransactionMetadatum.new_int(Int.from_str(amount.toString())),
		);

		map.insert_str('t', TransactionMetadatum.new_text('bridge'));
		map.insert_str('d', TransactionMetadatum.new_text(destinationChain));

		const senderAddressList = MetadataList.new();
		const chunkedSenderAddresses = splitStringIntoChunks(senderAddress);
		chunkedSenderAddresses.forEach((chunk) => {
			senderAddressList.add(TransactionMetadatum.new_text(chunk));
		});

		map.insert(
			TransactionMetadatum.new_text('s'),
			TransactionMetadatum.new_list(senderAddressList),
		);

		const list = MetadataList.new();
		list.add(TransactionMetadatum.new_map(map_t1));

		map.insert(
			TransactionMetadatum.new_text('tx'),
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

		const txJs = tx.auxiliary_data()?.metadata();
		const metadata = txJs?.get(BigNum.one());
		const map = metadata?.as_map();
		const senderAddressArr = map
			?.get(TransactionMetadatum.new_text('s'))
			.as_list();
		const senderAddress = Array(senderAddressArr).join('');

		const destinationChain = map
			?.get(TransactionMetadatum.new_text('d'))
			.as_text();

		const transactionsMap = map
			?.get(TransactionMetadatum.new_text('tx'))
			.as_list();
		const metadataTx = transactionsMap?.get(0).as_map();

		const addressArr = metadataTx?.get_str('a').as_list();
		const address = Array(addressArr).join('');

		const amount = metadataTx?.get_str('m').as_text();

		const entity = new BridgeTransaction();

		entity.senderAddress = senderAddress ?? entity.senderAddress;
		entity.receiverAddress = address ?? entity.receiverAddress;
		entity.destinationChain =
			(destinationChain as ChainEnum) ?? entity.destinationChain;
		entity.amount = amount ? Number(Int.from_str(amount)) : entity.amount;

		entity.originChain = chain;
		entity.createdAt = new Date();
		entity.status = TransactionStatusEnum.Pending;

		const newBridgeTransaction =
			this.bridgeTransactionRepository.create(entity);
		await this.bridgeTransactionRepository.save(newBridgeTransaction);

		const res = await client.submitTransaction(tx.to_hex());
		client.shutdown();
		return res;
	}
}
