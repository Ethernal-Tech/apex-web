import { ChainEnum } from 'src/common/enum';
import {
	CreateCardanoTransactionResponseDto,
	ErrorResponseDto,
	CreateTransactionDto,
	CreateEthTransactionResponseDto,
	CardanoTransactionFeeResponseDto,
} from './transaction.dto';
import axios, { AxiosError } from 'axios';
import {
	BadRequestException,
	InternalServerErrorException,
	Logger,
} from '@nestjs/common';
import web3, { Web3 } from 'web3';
import { isAddress } from 'web3-validator';
import { NewAddress, RewardAddress } from 'src/utils/Address/addreses';
import { areChainsEqual, toNumChainID } from 'src/utils/chainUtils';
import { nexusBridgingContractABI } from './nexusBridgingContract.abi';
import { BridgingSettingsDto } from 'src/settings/settings.dto';
import { convertDfmToWei } from 'src/utils/generalUtils';
import { Utxo } from 'src/blockchain/dto';
import { getAppSettings } from 'src/appSettings/appSettings';

const appSettings = getAppSettings();

const prepareCreateCardanoBridgingTx = (
	dto: CreateTransactionDto,
	skipUtxos: Utxo[] | undefined,
) => {
	// centralized bridge currently doesn't support prime->vector, vector->prime
	const nexusInvolved =
		dto.originChain === ChainEnum.Nexus ||
		dto.destinationChain === ChainEnum.Nexus;

	const isCentralized =
		appSettings.features.useCentralizedBridge && nexusInvolved;

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
		skipUtxos,
		utxoCacheKey: dto.utxoCacheKey,
	};

	return body;
};

export const createCardanoBridgingTx = async (
	dto: CreateTransactionDto,
	skipUtxos: Utxo[] | undefined,
): Promise<CreateCardanoTransactionResponseDto> => {
	const apiUrl = appSettings.cardanoApiUrl;
	const apiKey = process.env.CARDANO_API_API_KEY || 'test_api_key';
	const endpointUrl = apiUrl + `/api/CardanoTx/CreateBridgingTx`;

	const body = prepareCreateCardanoBridgingTx(dto, skipUtxos);

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
	skipUtxos: Utxo[] | undefined,
): Promise<CardanoTransactionFeeResponseDto> => {
	const apiUrl = appSettings.cardanoApiUrl;
	const apiKey = process.env.CARDANO_API_API_KEY || 'test_api_key';
	const endpointUrl = apiUrl + `/api/CardanoTx/GetBridgingTxFee`;

	const body = prepareCreateCardanoBridgingTx(dto, skipUtxos);

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

export const createEthBridgingTx = (
	dto: CreateTransactionDto,
	bridgingSettings: BridgingSettingsDto,
): CreateEthTransactionResponseDto => {
	if (!isAddress(dto.senderAddress)) {
		throw new BadRequestException('Invalid sender address');
	}

	const minValue = BigInt(
		convertDfmToWei(bridgingSettings.minValueToBridge || '1000000'),
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

	if (
		!areChainsEqual(
			dto.destinationChain,
			addr.GetNetwork(),
			appSettings.app.isMainnet,
		)
	) {
		throw new BadRequestException(
			`Destination address: ${dto.destinationAddress} not compatible with destination chain: ${dto.destinationChain}`,
		);
	}

	const destMinFee =
		bridgingSettings.minChainFeeForBridging[dto.destinationChain];
	if (!destMinFee) {
		throw new InternalServerErrorException(
			`No minFee for destination chain: ${dto.destinationChain}`,
		);
	}
	const minBridgingFee = BigInt(convertDfmToWei(destMinFee || '1000010'));

	let bridgingFee = BigInt(dto.bridgingFee || '0');
	bridgingFee = bridgingFee < minBridgingFee ? minBridgingFee : bridgingFee;

	const maxAllowedToBridge = BigInt(
		convertDfmToWei(bridgingSettings.maxAmountAllowedToBridge) || '0',
	);

	if (
		maxAllowedToBridge !== BigInt(0) &&
		maxAllowedToBridge < BigInt(dto.amount)
	) {
		throw new BadRequestException(
			`Amount: ${dto.amount} more than max allowed: ${maxAllowedToBridge}`,
		);
	}

	const createFunc = appSettings.features.useCentralizedBridge
		? ethCentralizedBridgingTx
		: ethBridgingTx;
	return await createFunc(dto, BigInt(dto.amount) + bridgingFee, bridgingFee);
};

const ethBridgingTx = (
	dto: CreateTransactionDto,
	value: bigint,
	bridgingFee: bigint,
): CreateEthTransactionResponseDto => {
	const to = cfg.bridge.addresses.nexusBridging;
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

const ethCentralizedBridgingTx = (
	dto: CreateTransactionDto,
	value: bigint,
	bridgingFee: bigint,
): CreateEthTransactionResponseDto => {
	const to = cfg.bridge.addresses.nexusBridging;
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
