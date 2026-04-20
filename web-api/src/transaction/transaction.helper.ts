import {
	BridgingModeEnum,
	ChainApexBridgeEnum,
	ChainEnum,
} from 'src/common/enum';
import {
	CreateCardanoTransactionResponseDto,
	ErrorResponseDto,
	CreateTransactionDto,
	CardanoTransactionFeeResponseDto,
	CreateEthTransactionFullResponseDto,
	EthTransactionResponseDto,
	CreateSolanaTransactionFullResponseDto,
} from './transaction.dto';
import axios, { AxiosError } from 'axios';
import {
	BadRequestException,
	InternalServerErrorException,
	Logger,
} from '@nestjs/common';
import web3, { Web3 } from 'web3';
import { isAddress } from 'web3-validator';
import {
	isCardanoChain,
	isEvmChain,
	isSolanaChain,
	toNumChainID,
} from 'src/utils/chainUtils';
import {
	erc20ABI,
	reactorGatewayABI,
	skylineGatewayABI,
} from './nexusBridgingContract.abi';
import {
	BridgingSettingsDto,
	BridgingSettingsTokenDto,
} from 'src/settings/settings.dto';
import {
	convertDfmToWei,
	getUrlAndApiKey,
	convertLamportsToWei,
	convertDfmToWeiByChain,
} from 'src/utils/generalUtils';
import { Utxo } from 'src/blockchain/dto';
import { getAppConfig } from 'src/appConfig/appConfig';
import {
	getCurrencyIDFromDirectionConfig,
	getSkylineGatewayAddress,
	getSkylineNativeTokenWalletAddress,
	getSkylineSolanaProgramAddress,
	getSkylineSolanaRelayerAddress,
	getSkylineSolanaTreasuryAddress,
} from 'src/settings/utils';
import {
	ValidateCardanoAddress,
	ValidateEVMAddress,
	ValidateSolanaAddress,
	isValidSolanaOnCurveAddress,
} from 'src/utils/Address/addreses';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import { AnchorProvider, BN, Program, Wallet } from '@coral-xyz/anchor';
import {
	Connection,
	Keypair,
	PublicKey,
	SystemProgram,
	Transaction as SolanaTransaction,
} from '@solana/web3.js';
import {
	ASSOCIATED_TOKEN_PROGRAM_ID,
	getAssociatedTokenAddressSync,
	NATIVE_MINT,
	TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

const loadSolanaProgramIdl = () => {
	const idlPath = path.join(__dirname, 'solana', 'skyline_program.json');
	return JSON.parse(readFileSync(idlPath, 'utf8')) as {
		address: string;
		constants?: { name: string; value: string }[];
	};
};

const parseSeedConst = (
	idl: { constants?: { name: string; value: string }[] },
	name: string,
): Buffer => {
	const seedConst = (idl.constants || []).find((x) => x.name === name);
	if (!seedConst) {
		throw new InternalServerErrorException(
			`missing seed constant in IDL: ${name}`,
		);
	}

	let values: number[];
	try {
		values = JSON.parse(seedConst.value);
	} catch {
		throw new InternalServerErrorException(
			`invalid seed constant format in IDL: ${name}`,
		);
	}

	return Buffer.from(values);
};

const skylineDestinationChainId = (chain: string): string => {
	if (
		chain === ChainApexBridgeEnum.Prime ||
		chain === ChainApexBridgeEnum.Vector ||
		chain === ChainApexBridgeEnum.Nexus ||
		chain === ChainApexBridgeEnum.Cardano ||
		chain === ChainApexBridgeEnum.Polygon ||
		chain === ChainApexBridgeEnum.Solana
	) {
		return chain;
	}

	if (chain === ChainEnum.BNB) {
		return ChainEnum.BNB;
	}

	if (chain === ChainEnum.Base) {
		return ChainEnum.Base;
	}

	throw new BadRequestException(`unsupported destination chain: ${chain}`);
};

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

	const srcCurrencyID = getCurrencyIDFromDirectionConfig(
		bridgingSettings.directionConfig,
		dto.originChain,
	);
	if (!srcCurrencyID) {
		throw new BadRequestException(
			`failed to find currencyID for chain: ${dto.originChain}`,
		);
	}

	const dstCurrencyID = getCurrencyIDFromDirectionConfig(
		bridgingSettings.directionConfig,
		dto.destinationChain,
	);
	if (!dstCurrencyID) {
		throw new BadRequestException(
			`failed to find currencyID for chain: ${dto.destinationChain}`,
		);
	}

	const tokenPair = (
		(bridgingSettings.directionConfig[dto.originChain] || { destChain: {} })
			.destChain[dto.destinationChain] || {}
	).find((x) => x.srcTokenID === dto.tokenID)!;

	const isCurrencyBridging = dto.tokenID === srcCurrencyID;
	const isWrappedCurrencyBridging =
		!isCurrencyBridging && tokenPair.dstTokenID === dstCurrencyID;

	const destChain = dto.destinationChain as ChainEnum;

	let minValue: bigint;
	if (isSolanaChain(destChain)) {
		minValue = BigInt(
			convertLamportsToWei(bridgingSettings.minValueToBridge), //TODO: check if this is correct
		);
	} else if (isCardanoChain(destChain) && isWrappedCurrencyBridging) {
		minValue = BigInt(
			convertDfmToWei(bridgingSettings.minUtxoChainValue[dto.destinationChain]),
		);
	} else if (isCardanoChain(destChain) && isCurrencyBridging) {
		minValue = BigInt(convertDfmToWei(bridgingSettings.minValueToBridge));
	} else {
		const minValueSrc = BigInt(
			bridgingSettings.minColCoinsAllowedToBridge[dto.originChain] || '0',
		);
		const minValueDst = isEvmChain(destChain)
			? BigInt(bridgingSettings.minColCoinsAllowedToBridge[destChain] || '0')
			: BigInt(
					convertDfmToWei(
						bridgingSettings.minColCoinsAllowedToBridge[destChain],
					),
				);

		minValue = minValueSrc > minValueDst ? minValueSrc : minValueDst;
	}

	const minValueToBridge = BigInt(minValue || '0');
	const amount = BigInt(dto.amount);

	if (amount < minValueToBridge) {
		throw new BadRequestException(
			`Amount: ${amount} less than minimum: ${minValueToBridge}`,
		);
	}

	if (isCardanoChain(destChain)) {
		ValidateCardanoAddress(dto.destinationAddress);
	} else if (isEvmChain(destChain)) {
		ValidateEVMAddress(dto.destinationAddress);
	} else if (isSolanaChain(destChain)) {
		ValidateSolanaAddress(dto.destinationAddress);
	} else {
		throw new BadRequestException(
			`Unsupported destination chain: ${dto.destinationChain}`,
		);
	}

	const minFee =
		bridgingMode === BridgingModeEnum.Reactor
			? convertDfmToWei(
					bridgingSettings.minChainFeeForBridging[dto.destinationChain],
				)
			: bridgingSettings.minChainFeeForBridging[dto.originChain];
	if (!minFee) {
		throw new InternalServerErrorException(
			`No minFee for chain: ${bridgingMode === BridgingModeEnum.Reactor ? dto.destinationChain : dto.originChain}`,
		);
	}
	const minBridgingFee = BigInt(minFee || '0');
	let bridgingFee = BigInt(dto.bridgingFee || '0');
	bridgingFee = bridgingFee < minBridgingFee ? minBridgingFee : bridgingFee;

	const minOperationFee = BigInt(
		bridgingSettings.minOperationFee[dto.originChain] || '0',
	);
	let operationFee = BigInt(dto.operationFee || '0');
	operationFee =
		operationFee < minOperationFee ? minOperationFee : operationFee;

	if (isCurrencyBridging) {
		const maxAllowedToBridge = BigInt(
			bridgingSettings.maxAmountAllowedToBridge || '0',
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
			bridgingSettings.maxTokenAmountAllowedToBridge || '0',
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

		const tokenInfo = (
			bridgingSettings.directionConfig[dto.originChain] || { tokens: {} }
		).tokens[dto.tokenID];
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

export const createSolanaBridgingTx = async (
	dto: CreateTransactionDto,
	bridgingSettings: BridgingSettingsDto,
): Promise<CreateSolanaTransactionFullResponseDto> => {
	if (!isValidSolanaOnCurveAddress(dto.senderAddress)) {
		throw new BadRequestException('Invalid sender address');
	}

	const srcCurrencyID = getCurrencyIDFromDirectionConfig(
		bridgingSettings.directionConfig,
		dto.originChain,
	);
	if (!srcCurrencyID) {
		throw new BadRequestException(
			`failed to find currencyID for chain: ${dto.originChain}`,
		);
	}

	const dstCurrencyID = getCurrencyIDFromDirectionConfig(
		bridgingSettings.directionConfig,
		dto.destinationChain,
	);
	if (!dstCurrencyID) {
		throw new BadRequestException(
			`failed to find currencyID for chain: ${dto.destinationChain}`,
		);
	}

	const destChain = dto.destinationChain as ChainEnum;

	// validate amount to bridge
	const minValue = isEvmChain(destChain)
		? BigInt(bridgingSettings.minValueToBridge || '0')
		: BigInt(
				convertDfmToWeiByChain(bridgingSettings.minValueToBridge, destChain),
			);

	const minValueToBridge = BigInt(minValue || '0');
	const amount = BigInt(convertLamportsToWei(dto.amount));

	if (amount < minValueToBridge) {
		throw new BadRequestException(
			`Amount: ${amount} less than minimum: ${minValueToBridge}`,
		);
	}

	// validate destination address
	if (isCardanoChain(destChain)) {
		ValidateCardanoAddress(dto.destinationAddress);
	} else if (isEvmChain(destChain)) {
		ValidateEVMAddress(dto.destinationAddress);
	} else {
		throw new BadRequestException(
			`Unsupported destination chain: ${dto.destinationChain}`,
		);
	}

	// validate bridging fee
	const minFee = bridgingSettings.minChainFeeForBridging[dto.originChain];
	if (!minFee) {
		throw new InternalServerErrorException(
			`No minFee for chain: ${dto.originChain}`,
		);
	}
	const minBridgingFee = BigInt(minFee || '0');
	let bridgingFee = BigInt(dto.bridgingFee || '0');
	bridgingFee = bridgingFee < minBridgingFee ? minBridgingFee : bridgingFee;

	// validate operation fee
	const minOperationFee = BigInt(
		bridgingSettings.minOperationFee[dto.originChain] || '0',
	);
	let operationFee = BigInt(dto.operationFee || '0');
	operationFee =
		operationFee < minOperationFee ? minOperationFee : operationFee;

	// validate max token amount allowed to bridge
	const maxTokenAmountAllowedToBridge = BigInt(
		bridgingSettings.maxTokenAmountAllowedToBridge || '0',
	);

	if (
		maxTokenAmountAllowedToBridge !== BigInt(0) &&
		maxTokenAmountAllowedToBridge < BigInt(dto.amount)
	) {
		throw new BadRequestException(
			`Token Amount: ${dto.amount} more than max allowed: ${maxTokenAmountAllowedToBridge}`,
		);
	}

	const tokenInfo = (
		bridgingSettings.directionConfig[dto.originChain] || { tokens: {} }
	).tokens[dto.tokenID];
	if (!tokenInfo) {
		throw new BadRequestException(
			`token ${dto.tokenID} not defined for chain ${dto.originChain}`,
		);
	}

	return await skylineSolanaBridgingTx(
		dto,
		srcCurrencyID,
		tokenInfo,
		bridgingFee,
		operationFee,
	);
};

const skylineSolanaBridgingTx = async (
	dto: CreateTransactionDto,
	srcCurrencyID: number,
	tokenInfo: BridgingSettingsTokenDto,
	bridgingFee: bigint,
	operationFee: bigint,
): Promise<CreateSolanaTransactionFullResponseDto> => {
	const solanaProgram = getSkylineSolanaProgramAddress();
	const treasuryAddress = getSkylineSolanaTreasuryAddress();
	const relayerAddress = getSkylineSolanaRelayerAddress();
	if (!solanaProgram || !treasuryAddress || !relayerAddress) {
		throw new InternalServerErrorException(
			`Missing skyline solana addresses for chain: ${dto.originChain}`,
		);
	}

	const idl = loadSolanaProgramIdl();
	const programId = new PublicKey(solanaProgram || idl.address);
	const mint =
		tokenInfo.chainSpecific === 'lovelace'
			? NATIVE_MINT
			: new PublicKey(tokenInfo.chainSpecific);
	const signer = new PublicKey(dto.senderAddress);
	const treasury = new PublicKey(treasuryAddress);
	const relayer = new PublicKey(relayerAddress);

	const validatorSetSeed = parseSeedConst(idl, 'VALIDATOR_SET_SEED');
	const vaultSeed = parseSeedConst(idl, 'VAULT_SEED');
	const feeConfigSeed = parseSeedConst(idl, 'FEE_CONFIG_SEED');
	const tokenRegistrySeed = parseSeedConst(idl, 'TOKEN_REGISTRY_SEED');

	const [validatorSetPda] = PublicKey.findProgramAddressSync(
		[validatorSetSeed],
		programId,
	);
	const [vaultPda] = PublicKey.findProgramAddressSync([vaultSeed], programId);
	const [feeConfigPda] = PublicKey.findProgramAddressSync(
		[feeConfigSeed],
		programId,
	);
	const [tokenRegistryPda] = PublicKey.findProgramAddressSync(
		[tokenRegistrySeed, mint.toBuffer()],
		programId,
	);

	const senderAta = getAssociatedTokenAddressSync(mint, signer);
	const vaultAta = getAssociatedTokenAddressSync(mint, vaultPda, true);

	const connection = new Connection(
		process.env.SOLANA_RPC_URL || '',
		'confirmed',
	);
	const provider = new AnchorProvider(
		connection,
		new Wallet(Keypair.generate()),
		{
			commitment: 'confirmed',
		},
	);
	const program = new Program(idl as any, provider);

	const bridgeRequestInstruction = await program.methods
		.bridgeRequest(
			new BN(dto.amount),
			dto.destinationAddress,
			skylineDestinationChainId(dto.destinationChain),
			new BN((bridgingFee + operationFee).toString()),
		)
		.accounts({
			signer,
			validatorSet: validatorSetPda,
			signersAta: senderAta,
			vault: vaultPda,
			vaultAta,
			mint,
			tokenRegistry: tokenRegistryPda,
			tokenProgram: TOKEN_PROGRAM_ID,
			systemProgram: SystemProgram.programId,
			associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
			feeConfig: feeConfigPda,
			treasury,
			relayer,
		})
		.instruction();

	const tx = new SolanaTransaction();
	const { blockhash } = await connection.getLatestBlockhash('finalized');
	tx.recentBlockhash = blockhash;
	tx.feePayer = signer;
	tx.add(bridgeRequestInstruction);
	const tokenAmount =
		dto.tokenID === srcCurrencyID ? BigInt(0) : BigInt(dto.amount);

	return {
		bridgingTx: {
			solTx: {
				txRaw: tx.serialize({ requireAllSignatures: false }).toString('base64'),
			},
			bridgingFee: bridgingFee.toString(10),
			operationFee: operationFee.toString(10),
			tokenAmount: tokenAmount.toString(10),
			tokenID: dto.tokenID,
			isFallback: false,
		},
	};
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
				getSkylineNativeTokenWalletAddress(dto.originChain),
				web3.utils.toHex(BigInt(dto.amount)),
			)
			.encodeABI();

		approvalTx = {
			from: dto.senderAddress,
			to,
			value: web3.utils.toHex(0),
			data: calldata,
		};
	}

	const to = getSkylineGatewayAddress(dto.originChain);
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
			ethTx: {
				from: dto.senderAddress,
				to,
				value: web3.utils.toHex(value),
				data: calldata,
			},
			bridgingFee: web3.utils.toHex(bridgingFee),
			operationFee: web3.utils.toHex(operationFee),
			tokenAmount: web3.utils.toHex(
				BigInt(isCurrencyBridging ? '0' : dto.amount),
			),
			tokenID: dto.tokenID,
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
			ethTx: {
				from: dto.senderAddress,
				to,
				value: web3.utils.toHex(value),
				data: calldata,
			},
			bridgingFee: web3.utils.toHex(bridgingFee),
			operationFee: web3.utils.toHex(0),
			tokenAmount: web3.utils.toHex(0),
			tokenID: 0,
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
			ethTx: {
				from: dto.senderAddress,
				to,
				value: web3.utils.toHex(value),
				data: calldata,
			},
			bridgingFee: web3.utils.toHex(bridgingFee),
			operationFee: web3.utils.toHex(0),
			tokenAmount: web3.utils.toHex(0),
			tokenID: 0,
			isFallback: true,
		},
	};
};

export function canUpdateTx(
	ip: string,
	clientID?: string | null,
	activeFrom?: Date,
): boolean {
	const hash = createHash('sha256')
		.update(ip + (getAppConfig().hashSecret ?? ''))
		.digest('hex');

	return hash === clientID && !!activeFrom && activeFrom > new Date();
}
