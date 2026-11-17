import {
	BadRequestException,
	ConflictException,
	Injectable,
	InternalServerErrorException,
	Logger,
	NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { IsNull, LessThan, Repository } from 'typeorm';
import { AppConfigService } from 'src/appConfig/appConfig.service';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import {
	BridgingModeEnum,
	ChainApexBridgeEnum,
	ChainEnum,
	TransactionStatusEnum,
} from 'src/common/enum';
import { SettingsService } from 'src/settings/settings.service';
import {
	ValidateCardanoAddress,
	ValidateEVMAddress,
	ValidateSolanaAddress,
} from 'src/utils/Address/addreses';
import {
	getBridgingMode,
	isCardanoChain,
	isEvmZeroAddress,
	isSolanaChain,
	ZERO_ADDRESS_DESTINATION_ERROR,
} from 'src/utils/chainUtils';
import { BridgeIntent } from './bridgeIntent.entity';
import {
	BridgeIntentDto,
	BridgeIntentStateEnum,
	BridgeIntentStatus,
} from './bridgeIntent.dto';

/** How long the user has to open the link and sign */
const INTENT_TTL_MS = 60 * 60 * 1000;
/** Expired intents nobody signed are kept this long, then deleted */
const EXPIRED_INTENT_RETENTION_MS = 24 * 60 * 60 * 1000;

// same precision the bridge form accepts
const AMOUNT_REGEX = /^(0|[1-9]\d*)(\.\d{1,6})?$/;
const HEX_TX_HASH_REGEX = /^(0x)?[0-9a-fA-F]{64}$/;
const BASE58_TX_HASH_REGEX = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;

export type CreateBridgeIntentInput = {
	originChain: string;
	destinationChain: string;
	tokenID: number;
	amount: string;
	destinationAddress: string;
};

export type CreatedBridgeIntent = {
	intent: BridgeIntentDto;
	bridgingMode: BridgingModeEnum;
	signingUrl: string;
};

export const chainTypeOf = (chain: ChainEnum): 'utxo' | 'evm' | 'svm' =>
	isCardanoChain(chain) ? 'utxo' : isSolanaChain(chain) ? 'svm' : 'evm';

@Injectable()
export class BridgeIntentService {
	constructor(
		@InjectRepository(BridgeIntent)
		private readonly intentRepository: Repository<BridgeIntent>,
		@InjectRepository(BridgeTransaction)
		private readonly bridgeTransactionRepository: Repository<BridgeTransaction>,
		private readonly settingsService: SettingsService,
		private readonly appConfig: AppConfigService,
	) {}

	async create(input: CreateBridgeIntentInput): Promise<CreatedBridgeIntent> {
		const frontendUrl = this.frontendUrl();
		if (!frontendUrl) {
			throw new InternalServerErrorException(
				'Bridge frontend URL not configured',
			);
		}

		const originChain = input.originChain.trim().toLowerCase() as ChainEnum;
		const destinationChain = input.destinationChain
			.trim()
			.toLowerCase() as ChainEnum;
		const destinationAddress = input.destinationAddress.trim();
		const amount = input.amount.trim();

		const bridgingMode = this.validateRoute(
			originChain,
			destinationChain,
			input.tokenID,
		);
		this.validateDestinationAddress(destinationChain, destinationAddress);

		if (!AMOUNT_REGEX.test(amount) || /^0(\.0*)?$/.test(amount)) {
			throw new BadRequestException(
				`Invalid amount: ${input.amount}. Use a positive decimal number with at most 6 decimals, e.g. "12.5"`,
			);
		}

		const now = new Date();
		const entity = this.intentRepository.create({
			id: randomUUID(),
			originChain,
			destinationChain,
			tokenID: input.tokenID,
			amount,
			destinationAddress,
			createdAt: now,
			expiresAt: new Date(now.getTime() + INTENT_TTL_MS),
			txHash: null,
			submittedAt: null,
		});
		await this.intentRepository.save(entity);

		return {
			intent: this.toDto(entity),
			bridgingMode,
			signingUrl: `${frontendUrl}/bridge-app?intent=${entity.id}`,
		};
	}

	async get(id: string): Promise<BridgeIntentDto> {
		return this.toDto(await this.findOrThrow(id));
	}

	async submit(id: string, txHash: string): Promise<BridgeIntentDto> {
		const intent = await this.findOrThrow(id);
		const hash = txHash.trim();

		if (intent.txHash) {
			if (intent.txHash === hash) {
				return this.toDto(intent);
			}
			throw new ConflictException('Bridge intent already submitted');
		}

		const hashRegex = isSolanaChain(intent.originChain)
			? BASE58_TX_HASH_REGEX
			: HEX_TX_HASH_REGEX;
		if (!hashRegex.test(hash)) {
			throw new BadRequestException(`Invalid tx hash: ${hash}`);
		}

		// Not rejected when expired: signing may have started just before expiry,
		// and the tx is on chain by now either way.
		intent.txHash = hash;
		intent.submittedAt = new Date();
		await this.intentRepository.save(intent);

		return this.toDto(intent);
	}

	async getStatus(id: string): Promise<BridgeIntentStatus> {
		const intent = await this.findOrThrow(id);
		const status: BridgeIntentStatus = {
			intentId: intent.id,
			state: this.intentState(intent),
			originChain: intent.originChain,
			destinationChain: intent.destinationChain,
			amount: intent.amount,
			tokenID: intent.tokenID,
			destinationAddress: intent.destinationAddress,
			expiresAt: intent.expiresAt,
		};

		if (!intent.txHash) {
			return status;
		}

		status.sourceTxHash = intent.txHash;

		const tx = await this.bridgeTransactionRepository.findOne({
			where: { originChain: intent.originChain, sourceTxHash: intent.txHash },
		});
		if (!tx) {
			return status;
		}

		status.state = bridgeTransactionState(tx);
		status.bridgeStatus = tx.status;
		status.destinationTxHash = tx.destinationTxHash || undefined;
		const frontendUrl = this.frontendUrl();
		if (frontendUrl) {
			status.transactionUrl = `${frontendUrl}/transaction/${tx.id}`;
		}

		return status;
	}

	@Cron(CronExpression.EVERY_HOUR, { name: 'deleteExpiredBridgeIntents' })
	async deleteExpired(): Promise<void> {
		try {
			const result = await this.intentRepository.delete({
				txHash: IsNull(),
				expiresAt: LessThan(new Date(Date.now() - EXPIRED_INTENT_RETENTION_MS)),
			});
			if (result.affected) {
				Logger.log(`Deleted ${result.affected} expired bridge intent(s)`);
			}
		} catch (e) {
			Logger.error(`Failed to delete expired bridge intents: ${e}`, e.stack);
		}
	}

	private validateRoute(
		originChain: ChainEnum,
		destinationChain: ChainEnum,
		tokenID: number,
	): BridgingModeEnum {
		const settings = this.settingsService.SettingsResponse;
		const enabledChains = settings.enabledChains;

		for (const chain of [originChain, destinationChain]) {
			if (!enabledChains.includes(chain)) {
				throw new BadRequestException(
					`Chain ${chain} not supported. Supported chains: ${enabledChains.join(', ')}`,
				);
			}
		}

		const bridgingMode = getBridgingMode(
			originChain,
			destinationChain,
			tokenID,
			settings,
		);
		if (!bridgingMode) {
			throw new BadRequestException(
				`Bridging token ${tokenID} from ${originChain} to ${destinationChain} not supported`,
			);
		}

		return bridgingMode;
	}

	private validateDestinationAddress(
		destinationChain: ChainEnum,
		address: string,
	) {
		if (isCardanoChain(destinationChain)) {
			ValidateCardanoAddress(
				destinationChain as ChainApexBridgeEnum,
				address,
				this.appConfig.app.isMainnet,
			);
		} else if (isSolanaChain(destinationChain)) {
			ValidateSolanaAddress(address);
		} else {
			ValidateEVMAddress(address);
			if (isEvmZeroAddress(address)) {
				throw new BadRequestException(ZERO_ADDRESS_DESTINATION_ERROR);
			}
		}
	}

	private async findOrThrow(id: string): Promise<BridgeIntent> {
		// anything else is not an intent id, and would fail the uuid column cast
		if (
			!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
				id,
			)
		) {
			throw new NotFoundException('Bridge intent not found');
		}

		const intent = await this.intentRepository.findOne({ where: { id } });
		if (!intent) {
			throw new NotFoundException('Bridge intent not found');
		}

		return intent;
	}

	private intentState(intent: BridgeIntent): BridgeIntentStateEnum {
		if (intent.txHash) {
			return BridgeIntentStateEnum.Submitted;
		}

		return intent.expiresAt.getTime() <= Date.now()
			? BridgeIntentStateEnum.Expired
			: BridgeIntentStateEnum.AwaitingSignature;
	}

	private toDto(intent: BridgeIntent): BridgeIntentDto {
		const dto = new BridgeIntentDto();
		dto.id = intent.id;
		dto.originChain = intent.originChain;
		dto.destinationChain = intent.destinationChain;
		dto.tokenID = intent.tokenID;
		dto.amount = intent.amount;
		dto.destinationAddress = intent.destinationAddress;
		dto.createdAt = intent.createdAt;
		dto.expiresAt = intent.expiresAt;
		dto.txHash = intent.txHash ?? undefined;
		dto.state = this.intentState(intent);
		return dto;
	}

	private frontendUrl(): string | undefined {
		return this.appConfig.frontendUrl?.replace(/\/+$/, '') || undefined;
	}
}

const bridgeTransactionState = (
	tx: BridgeTransaction,
): BridgeIntentStateEnum => {
	if (tx.status === TransactionStatusEnum.InvalidRequest) {
		return BridgeIntentStateEnum.Failed;
	}

	if (tx.status === TransactionStatusEnum.ExecutedOnDestination) {
		return tx.isRefund
			? BridgeIntentStateEnum.Refunded
			: BridgeIntentStateEnum.Success;
	}

	return tx.isRefund
		? BridgeIntentStateEnum.Refunding
		: BridgeIntentStateEnum.Pending;
};
