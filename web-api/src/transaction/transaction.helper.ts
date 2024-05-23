import { createTransactionSubmissionClient } from '@cardano-ogmios/client';
import { createInteractionContext } from '@cardano-ogmios/client';
import { ChainEnum } from 'src/common/enum';
import {
	CreateTransactionReceiverDto,
	CreateTransactionResponseDto,
	ErrorResponseDto,
	TransactionResponseDto,
} from './transaction.dto';
import axios from 'axios';
import { BadRequestException } from '@nestjs/common';

export const createBridgingTx = async (
	senderAddr: string,
	sourceChainId: string,
	destinationChainId: string,
	receivers: CreateTransactionReceiverDto[],
	bridgingFee?: number,
): Promise<CreateTransactionResponseDto> => {
	const oracleUrl = process.env.ORACLE_URL || 'http://localhost:40000';
	const oracleApiKey = process.env.ORACLE_API_KEY || 'test_api_key';
	const apiUrl = oracleUrl + `/api/CardanoTx/CreateBridgingTx`;

	const body = {
		senderAddr,
		sourceChainId,
		destinationChainId,
		transactions: receivers.map((x) => ({
			addr: x.address,
			amount: x.amount,
		})),
		bridgingFee,
	};

	try {
		const response = await axios.post(apiUrl, body, {
			headers: {
				'X-API-KEY': oracleApiKey,
				'Content-Type': 'application/json',
			},
		});

		return response.data as CreateTransactionResponseDto;
	} catch (error) {
		throw new BadRequestException(error.response.data as ErrorResponseDto);
	}
};

export const signBridgingTx = async (
	signingKeyHex: string,
	txRaw: string,
	txHash: string,
): Promise<TransactionResponseDto> => {
	const oracleUrl = process.env.ORACLE_URL || 'http://localhost:40000';
	const oracleApiKey = process.env.ORACLE_API_KEY || 'test_api_key';
	const apiUrl = oracleUrl + `/api/CardanoTx/SignBridgingTx`;

	const body = {
		signingKey: signingKeyHex,
		txRaw,
		txHash,
	};

	try {
		const response = await axios.post(apiUrl, body, {
			headers: {
				'X-API-KEY': oracleApiKey,
			},
		});

		return response.data as TransactionResponseDto;
	} catch (error) {
		throw new BadRequestException(error.response.data as ErrorResponseDto);
	}
};

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

export async function submitTransaction(chain: ChainEnum, signedTx: string) {
	const context = await createContext(chain);
	const client = await createTransactionSubmissionClient(context);

	const txId = await client.submitTransaction(signedTx);

	await client.shutdown();

	return txId;
}
