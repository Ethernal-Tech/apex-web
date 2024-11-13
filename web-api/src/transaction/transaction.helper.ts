import { createTransactionSubmissionClient } from '@cardano-ogmios/client';
import { createInteractionContext } from '@cardano-ogmios/client';
import { ChainEnum } from 'src/common/enum';
import {
	CreateCardanoTransactionResponseDto,
	ErrorResponseDto,
	CreateTransactionDto,
	CreateEthTransactionResponseDto,
	CardanoTransactionFeeResponseDto,
} from './transaction.dto';
import axios, { AxiosError } from 'axios';
import { BadRequestException, Logger } from '@nestjs/common';
import web3, { Web3 } from 'web3';
import { isAddress } from 'web3-validator';
import { NewAddress, RewardAddress } from 'src/utils/Address/addreses';
import { areChainsEqual, toNumChainID } from 'src/utils/chainUtils';
import { nexusBridgingContractABI } from './nexusBridgingContract.abi';
import { SettingsResponseDto } from 'src/settings/settings.dto';
import { convertDfmToWei } from 'src/utils/generalUtils';

const prepareCreateCardanoBridgingTx = (dto: CreateTransactionDto) => {
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

	return body;
};

export const createCardanoBridgingTx = async (
	dto: CreateTransactionDto,
): Promise<CreateCardanoTransactionResponseDto> => {
	const apiUrl = process.env.CARDANO_API_URL || 'http://localhost:40000';
	const apiKey = process.env.CARDANO_API_API_KEY || 'test_api_key';
	const endpointUrl = apiUrl + `/api/CardanoTx/CreateBridgingTx`;

	const body = prepareCreateCardanoBridgingTx(dto);

	try {
		Logger.debug(`axios.post: ${endpointUrl}, body: ${JSON.stringify(body)}`);
		const response = await axios.post(endpointUrl, body, {
			headers: {
				'X-API-KEY': apiKey,
				'Content-Type': 'application/json',
			},
		});

		Logger.debug(`axios.response: ${JSON.stringify(response.data)}`);

		return {
			...response.data,
			isFallback: body.useFallback,
		} as CreateCardanoTransactionResponseDto;
	} catch (error) {
		if (error instanceof AxiosError) {
			if (error.response) {
				throw new BadRequestException(error.response.data as ErrorResponseDto);
			}
		}

		throw new BadRequestException();
	}
};

export const getCardanoBridgingTxFee = async (
	dto: CreateTransactionDto,
): Promise<CardanoTransactionFeeResponseDto> => {
	const apiUrl = process.env.CARDANO_API_URL || 'http://localhost:40000';
	const apiKey = process.env.CARDANO_API_API_KEY || 'test_api_key';
	const endpointUrl = apiUrl + `/api/CardanoTx/GetBridgingTxFee`;

	const body = prepareCreateCardanoBridgingTx(dto);

	try {
		Logger.debug(`axios.post: ${endpointUrl}, body: ${JSON.stringify(body)}`);
		const response = await axios.post(endpointUrl, body, {
			headers: {
				'X-API-KEY': apiKey,
				'Content-Type': 'application/json',
			},
		});

		Logger.debug(`axios.response: ${JSON.stringify(response.data)}`);

		return response.data as CardanoTransactionFeeResponseDto;
	} catch (error) {
		if (error instanceof AxiosError) {
			if (error.response) {
				throw new BadRequestException(error.response.data as ErrorResponseDto);
			}
		}

		throw new BadRequestException();
	}
};

export const createEthBridgingTx = async (
	dto: CreateTransactionDto,
	bridgingSettings: SettingsResponseDto,
): Promise<CreateEthTransactionResponseDto> => {
	if (!isAddress(dto.senderAddress)) {
		throw new BadRequestException('Invalid sender address');
	}

	const minValue = BigInt(
		convertDfmToWei(bridgingSettings.minUtxoValue) || '1000000000000000000',
	);
	const amount = BigInt(dto.amount);

	if (amount < minValue) {
		throw new BadRequestException(
			`Amount: ${amount} less than minimum: ${minValue}`,
		);
	}

	const addr = NewAddress(dto.destinationAddress);
	if (
		!addr ||
		addr instanceof RewardAddress ||
		dto.destinationAddress !== addr.String()
	) {
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
		convertDfmToWei(bridgingSettings.minFeeForBridging) ||
			'1000010000000000000',
	);

	let bridgingFee = BigInt(dto.bridgingFee || '0');
	bridgingFee = bridgingFee < minBridgingFee ? minBridgingFee : bridgingFee;

	const value = BigInt(dto.amount) + bridgingFee;

	const maxAllowedToBridge = BigInt(
		convertDfmToWei(bridgingSettings.maxAmountAllowedToBridge) || '0',
	);

	if (maxAllowedToBridge !== BigInt(0) && maxAllowedToBridge < value) {
		throw new BadRequestException(
			`Amount+Fee: ${value} more than max allowed: ${maxAllowedToBridge}`,
		);
	}

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
		isFallback: false,
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
		isFallback: true,
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
		(err) => Logger.error(err),
		() => Logger.debug('Ogmios connection closed.'),
		{ connection: { host, port } },
	);
};

export async function submitCardanoTransaction(
	chain: ChainEnum,
	signedTx: string,
) {
	Logger.debug(`submitting cardano tx using ogmios`);

	const context = await createContext(chain);
	const client = await createTransactionSubmissionClient(context);

	const txId = await client.submitTransaction(signedTx);

	await client.shutdown();

	Logger.debug(`done submitting cardano tx using ogmios. txId: ${txId}`);

	return txId;
}
