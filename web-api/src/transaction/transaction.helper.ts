import { createTransactionSubmissionClient } from '@cardano-ogmios/client';
import { createInteractionContext } from '@cardano-ogmios/client';
import { ChainEnum } from 'src/common/enum';
import {
	CreateCardanoTransactionResponseDto,
	ErrorResponseDto,
	CreateTransactionDto,
	CreateEthTransactionResponseDto,
} from './transaction.dto';
import axios from 'axios';
import { BadRequestException } from '@nestjs/common';
import web3, { Web3 } from 'web3';
import { isAddress } from 'web3-validator';
import { NewAddress } from 'src/utils/Address/addreses';
import { areChainsEqual, toNumChainID } from 'src/utils/chainUtils';
import { nexusBridgingContractABI } from './nexusBridgingContract.abi';

export const createCardanoBridgingTx = async (
	dto: CreateTransactionDto,
): Promise<CreateCardanoTransactionResponseDto> => {
	const apiUrl = process.env.CARDANO_API_URL || 'http://localhost:40000';
	const apiKey = process.env.CARDANO_API_API_KEY || 'test_api_key';
	const endpointUrl = apiUrl + `/api/CardanoTx/CreateBridgingTx`;

	// centralized bridge currently doesn't support prime->vector, vector->prime
	const nexusInvolved =
		dto.originChain === ChainEnum.Nexus ||
		dto.destinationChain === ChainEnum.Nexus;

	const isCentralized =
		process.env.USE_CENTRALIZED_BRIDGE === 'true' && nexusInvolved;

	const body = {
		senderAddr: dto.senderAddress,
		sourceChainId: dto.originChain,
		destinationChainId: dto.destinationChain,
		transactions: [
			{
				addr: dto.destinationAddress,
				amount: +dto.amount,
			},
		],
		bridgingFee: dto.bridgingFee ? +dto.bridgingFee : undefined,
		useFallback: isCentralized,
	};

	try {
		const response = await axios.post(endpointUrl, body, {
			headers: {
				'X-API-KEY': apiKey,
				'Content-Type': 'application/json',
			},
		});

		return {
			...response.data,
			isCentralized,
		} as CreateCardanoTransactionResponseDto;
	} catch (error) {
		throw new BadRequestException(error.response.data as ErrorResponseDto);
	}
};

export const createEthBridgingTx = async (
	dto: CreateTransactionDto,
): Promise<CreateEthTransactionResponseDto> => {
	if (!isAddress(dto.senderAddress)) {
		throw new BadRequestException('Invalid sender address');
	}

	const minValue = BigInt(process.env.NEXUS_MIN_VALUE || '1000000000000000000');
	const amount = BigInt(dto.amount);

	if (amount < minValue) {
		throw new BadRequestException(
			`Amount: ${amount} less than minimum: ${minValue}`,
		);
	}

	const addr = NewAddress(dto.destinationAddress);
	if (!addr || dto.destinationAddress !== addr.String()) {
		throw new BadRequestException(
			`Invalid destination address: ${dto.destinationAddress}`,
		);
	}

	if (!areChainsEqual(dto.destinationChain, addr.GetNetwork())) {
		throw new BadRequestException(
			`Destination address: ${dto.destinationAddress} not compatible with destination chain: ${dto.destinationChain}`,
		);
	}

	const minBridgingFee = BigInt(
		process.env.NEXUS_MIN_BRIDGING_FEE || '1000010000000000000',
	);

	let bridgingFee = BigInt(dto.bridgingFee || '0');
	bridgingFee = bridgingFee < minBridgingFee ? minBridgingFee : bridgingFee;

	const value = BigInt(dto.amount) + bridgingFee;

	const isCentralized = process.env.USE_CENTRALIZED_BRIDGE === 'true';

	const createFunc = isCentralized ? ethCentralizedBridgingTx : ethBridgingTx;
	return await createFunc(dto, value, bridgingFee);
};

const ethBridgingTx = async (
	dto: CreateTransactionDto,
	value: bigint,
	bridgingFee: bigint,
): Promise<CreateEthTransactionResponseDto> => {
	const to = process.env.NEXUS_BRIDGING_ADDR;
	if (!to) {
		throw new BadRequestException('Empty to address');
	}

	const web3Obj = new Web3();
	const nexusBridgingContract = new web3Obj.eth.Contract(
		JSON.parse(nexusBridgingContractABI),
		to,
	);

	const calldata = nexusBridgingContract.methods
		.withdraw(
			toNumChainID(dto.destinationChain),
			[{ receiver: dto.destinationAddress, amount: dto.amount }],
			web3.utils.toHex(bridgingFee),
		)
		.encodeABI();

	return {
		from: dto.senderAddress,
		to,
		bridgingFee: web3.utils.toHex(bridgingFee),
		value: web3.utils.toHex(value),
		data: calldata,
		isCentralized: false,
	};
};

const ethCentralizedBridgingTx = async (
	dto: CreateTransactionDto,
	value: bigint,
	bridgingFee: bigint,
): Promise<CreateEthTransactionResponseDto> => {
	const to = process.env.NEXUS_CENTRALIZED_BRIDGING_ADDR;
	if (!to) {
		throw new BadRequestException('Empty to address');
	}

	const calldata = web3.utils.asciiToHex(
		JSON.stringify({
			destinationChain: dto.destinationChain,
			destnationAddress: dto.destinationAddress,
		}),
	);

	return {
		from: dto.senderAddress,
		to,
		bridgingFee: web3.utils.toHex(bridgingFee),
		value: web3.utils.toHex(value),
		data: calldata,
		isCentralized: true,
	};
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

export async function submitCardanoTransaction(
	chain: ChainEnum,
	signedTx: string,
) {
	const context = await createContext(chain);
	const client = await createTransactionSubmissionClient(context);

	const txId = await client.submitTransaction(signedTx);

	await client.shutdown();

	return txId;
}
