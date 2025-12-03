import { BridgingModeEnum, ChainApexBridgeEnum } from 'src/common/enum';
import {
	CreateCardanoTransactionResponseDto,
	ErrorResponseDto,
	CreateTransactionDto,
	CardanoTransactionFeeResponseDto,
	CreateEthTransactionFullResponseDto,
	EthTransactionResponseDto,
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
import {
	erc20ABI,
	reactorGatewayABI,
	skylineGatewayABI,
} from './nexusBridgingContract.abi';
import {
	BridgingSettingsDto,
	BridgingSettingsTokenDto,
} from 'src/settings/settings.dto';
import { convertDfmToWei, getUrlAndApiKey } from 'src/utils/generalUtils';
import { Utxo } from 'src/blockchain/dto';
import { getAppConfig } from 'src/appConfig/appConfig';
import { getCurrencyIDFromDirectionConfig } from 'src/settings/utils';

const prepareCreateCardanoBridgingTx = (
	dto: CreateTransactionDto,
	skipUtxos: Utxo[] | undefined,
) => {
	// centralized bridge currently doesn't support prime->vector, vector->prime
	const nexusInvolved =
		dto.originChain === ChainApexBridgeEnum.Nexus ||
		dto.destinationChain === ChainApexBridgeEnum.Nexus;

	const isCentralized =
		getAppConfig().features.useCentralizedBridge && nexusInvolved;

	const body = {
		senderAddr: dto.senderAddress,
		sourceChainId: dto.originChain,
		destinationChainId: dto.destinationChain,
		transactions: [
			{
				addr: dto.destinationAddress,
				amount: +dto.amount,
				tokenID: dto.tokenID,
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
	bridgingMode: BridgingModeEnum,
): Promise<CreateCardanoTransactionResponseDto> => {
	const { url, apiKey } = getUrlAndApiKey(bridgingMode, false);
	const endpointUrl = url + `/api/CardanoTx/CreateBridgingTx`;

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
	bridgingMode: BridgingModeEnum,
): Promise<CardanoTransactionFeeResponseDto> => {
	const { url, apiKey } = getUrlAndApiKey(bridgingMode, false);
	const endpointUrl = url + `/api/CardanoTx/GetBridgingTxFee`;

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
	bridgingMode: BridgingModeEnum,
	bridgingSettings: BridgingSettingsDto,
): CreateEthTransactionFullResponseDto => {
	const appConfig = getAppConfig();

	if (!isAddress(dto.senderAddress)) {
		throw new BadRequestException('Invalid sender address');
	}

	const currencyID = getCurrencyIDFromDirectionConfig(
		bridgingSettings.directionConfig,
		dto.originChain,
	);
	if (!currencyID) {
		throw new BadRequestException(
			`failed to find currencyID for chain: ${dto.originChain}`,
		);
	}

	const isCurrencyBridging = dto.tokenID === currencyID;

	const minValueToBridge = BigInt(
		convertDfmToWei(
			isCurrencyBridging
				? bridgingSettings.minValueToBridge
				: bridgingSettings.minColCoinsAllowedToBridge || '0',
		),
	);
	const amount = BigInt(dto.amount);

	if (amount < minValueToBridge) {
		throw new BadRequestException(
			`Amount: ${amount} less than minimum: ${minValueToBridge}`,
		);
	}

	// wTODO: support eth destinations also
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
			appConfig.app.isMainnet,
		)
	) {
		throw new BadRequestException(
			`Destination address: ${dto.destinationAddress} not compatible with destination chain: ${dto.destinationChain}`,
		);
	}

	const chainForMinFee =
		bridgingMode === BridgingModeEnum.Reactor
			? dto.destinationChain
			: dto.originChain;
	const minFee = bridgingSettings.minChainFeeForBridging[chainForMinFee];
	if (!minFee) {
		throw new InternalServerErrorException(
			`No minFee for chain: ${chainForMinFee}`,
		);
	}
	const minBridgingFee = BigInt(convertDfmToWei(minFee || '0'));
	let bridgingFee = BigInt(dto.bridgingFee || '0');
	bridgingFee = bridgingFee < minBridgingFee ? minBridgingFee : bridgingFee;

	const minOpFee = bridgingSettings.minOperationFee[dto.originChain];
	const minOperationFee = BigInt(convertDfmToWei(minOpFee || '0'));
	let operationFee = BigInt(dto.operationFee || '0');
	operationFee =
		operationFee < minOperationFee ? minOperationFee : operationFee;

	if (isCurrencyBridging) {
		const maxAllowedToBridge = BigInt(
			convertDfmToWei(bridgingSettings.maxAmountAllowedToBridge) || '0',
		);

		if (
			maxAllowedToBridge !== BigInt(0) &&
			maxAllowedToBridge < BigInt(dto.amount)
		) {
			throw new BadRequestException(
				`Currency Amount: ${dto.amount} more than max allowed: ${maxAllowedToBridge}`,
			);
		}
	} else {
		const maxTokenAmountAllowedToBridge = BigInt(
			convertDfmToWei(bridgingSettings.maxTokenAmountAllowedToBridge) || '0',
		);

		if (
			maxTokenAmountAllowedToBridge !== BigInt(0) &&
			maxTokenAmountAllowedToBridge < BigInt(dto.amount)
		) {
			throw new BadRequestException(
				`Token Amount: ${dto.amount} more than max allowed: ${maxTokenAmountAllowedToBridge}`,
			);
		}
	}

	if (bridgingMode === BridgingModeEnum.Reactor) {
		const createFunc = appConfig.features.useCentralizedBridge
			? ethCentralizedBridgingTx
			: reactorEthBridgingTx;

		return createFunc(dto, BigInt(dto.amount) + bridgingFee, bridgingFee);
	} else if (bridgingMode === BridgingModeEnum.Skyline) {
		let txValue = bridgingFee + operationFee;
		if (isCurrencyBridging) {
			txValue += BigInt(dto.amount);
		}

		const tokenInfo =
			bridgingSettings.directionConfig[dto.originChain].tokens[dto.tokenID];
		if (!tokenInfo) {
			throw new BadRequestException(
				`token ${dto.tokenID} not defined for chain ${dto.originChain}`,
			);
		}

		return skylineEthBridgingTx(
			dto,
			tokenInfo,
			isCurrencyBridging,
			txValue,
			bridgingFee,
			operationFee,
		);
	} else {
		throw new BadRequestException(
			`unsupported bridging mode: ${bridgingMode} for createEthBridgingTx`,
		);
	}
};

const skylineEthBridgingTx = (
	dto: CreateTransactionDto,
	tokenInfo: BridgingSettingsTokenDto,
	isCurrencyBridging: boolean,
	value: bigint,
	bridgingFee: bigint,
	operationFee: bigint,
): CreateEthTransactionFullResponseDto => {
	const web3Obj = new Web3();

	let approvalTx: EthTransactionResponseDto | undefined;
	if (!isCurrencyBridging && tokenInfo.lockUnlock) {
		const to = tokenInfo.chainSpecific;

		const erc20Contract = new web3Obj.eth.Contract(JSON.parse(erc20ABI), to);

		const calldata = erc20Contract.methods
			.approve(
				getAppConfig().bridge.addresses.skylineNexusNativeTokenWallet,
				web3.utils.toHex(value),
			)
			.encodeABI();

		approvalTx = {
			from: dto.senderAddress,
			to,
			value: web3.utils.toHex(0),
			data: calldata,
		};
	}

	const to = getAppConfig().bridge.addresses.skylineNexusGateway;
	if (!to) {
		throw new BadRequestException('Empty to address');
	}

	const contract = new web3Obj.eth.Contract(JSON.parse(skylineGatewayABI), to);

	const calldata = contract.methods
		.withdraw(
			toNumChainID(dto.destinationChain),
			[
				{
					receiver: dto.destinationAddress,
					amount: dto.amount,
					tokenId: dto.tokenID,
				},
			],
			web3.utils.toHex(bridgingFee),
			web3.utils.toHex(operationFee),
		)
		.encodeABI();

	return {
		approvalTx,
		bridgingTx: {
			from: dto.senderAddress,
			to,
			bridgingFee: web3.utils.toHex(bridgingFee),
			value: web3.utils.toHex(value),
			data: calldata,
			isFallback: false,
		},
	};
};

const reactorEthBridgingTx = (
	dto: CreateTransactionDto,
	value: bigint,
	bridgingFee: bigint,
): CreateEthTransactionFullResponseDto => {
	const to = getAppConfig().bridge.addresses.reactorNexusGateway;
	if (!to) {
		throw new BadRequestException('Empty to address');
	}

	const web3Obj = new Web3();
	const contract = new web3Obj.eth.Contract(JSON.parse(reactorGatewayABI), to);

	const calldata = contract.methods
		.withdraw(
			toNumChainID(dto.destinationChain),
			[{ receiver: dto.destinationAddress, amount: dto.amount }],
			web3.utils.toHex(bridgingFee),
		)
		.encodeABI();

	return {
		bridgingTx: {
			from: dto.senderAddress,
			to,
			bridgingFee: web3.utils.toHex(bridgingFee),
			value: web3.utils.toHex(value),
			data: calldata,
			isFallback: false,
		},
	};
};

const ethCentralizedBridgingTx = (
	dto: CreateTransactionDto,
	value: bigint,
	bridgingFee: bigint,
): CreateEthTransactionFullResponseDto => {
	const to = getAppConfig().bridge.addresses.reactorNexusCentralizedGateway;
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
		bridgingTx: {
			from: dto.senderAddress,
			to,
			bridgingFee: web3.utils.toHex(bridgingFee),
			value: web3.utils.toHex(value),
			data: calldata,
			isFallback: true,
		},
	};
};
