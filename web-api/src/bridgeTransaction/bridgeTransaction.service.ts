import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
	Between,
	FindOptionsOrder,
	FindOptionsWhere,
	LessThanOrEqual,
	MoreThanOrEqual,
	Repository,
} from 'typeorm';
import { BridgeTransaction } from './bridgeTransaction.entity';
import {
	BridgeTransactionDto,
	BridgeTransactionFilterDto,
	BridgeTransactionResponseDto,
} from './bridgeTransaction.dto';
import {
	getBridgingRequestStates,
	getNotFinalStateBridgeTransactions,
	isBridgeTransactionStateFinal,
	updateBridgeTransactionStates,
} from './bridgeTransaction.helper';
import { ChainEnum } from 'src/common/enum';

@Injectable()
export class BridgeTransactionService {
	constructor(
		@InjectRepository(BridgeTransaction)
		private readonly bridgeTransactionRepository: Repository<BridgeTransaction>,
	) {}

	async get(id: number, chain: ChainEnum): Promise<BridgeTransactionDto> {
		const entity = await this.bridgeTransactionRepository.findOne({
			where: { id },
		});
		if (!entity) {
			throw new NotFoundException();
		}

		// update status
		if (!isBridgeTransactionStateFinal(entity)) {
			const bridgingRequestStates = await getBridgingRequestStates(chain, [
				entity.sourceTxHash,
			]);
			const bridgingRequestState = bridgingRequestStates.find(
				(state) => state.sourceTxHash === entity.sourceTxHash,
			);
			if (
				bridgingRequestState &&
				bridgingRequestState.status !== entity.status
			) {
				entity.status = bridgingRequestStates[0].status;
				await this.bridgeTransactionRepository.save(entity);
			}
		}

		return this.mapToReponse(entity);
	}

	async getAllFiltered(
		model: BridgeTransactionFilterDto,
	): Promise<BridgeTransactionResponseDto> {
		const where: FindOptionsWhere<BridgeTransaction> = {
			destinationChain: model.destinationChain,
			receiverAddress: model.receiverAddress,
			senderAddress: model.senderAddress,
			originChain: model.originChain,
		};

		if (model.amountFrom && model.amountTo) {
			where.amount = Between(model.amountFrom, model.amountTo);
		} else if (model.amountFrom) {
			where.amount = MoreThanOrEqual(model.amountFrom);
		} else if (model.amountTo) {
			where.amount = LessThanOrEqual(model.amountTo);
		}

		const page = model.page || 0;
		const take = model.perPage || 10;
		const skip = page * take;

		let order: FindOptionsOrder<BridgeTransaction> | undefined = {
			createdAt: 'desc',
		};
		if (model.orderBy && model.order) {
			order = { [model.orderBy]: model.order };
		}

		const [entities, total] =
			await this.bridgeTransactionRepository.findAndCount({
				where,
				take,
				skip,
				order,
			});

		// update statuses
		const notFinalStateEntities = getNotFinalStateBridgeTransactions(entities);
		const notFinalStateTxHashes = notFinalStateEntities.map(
			(entity) => entity.sourceTxHash,
		);

		const bridgingRequestStates = await getBridgingRequestStates(
			model.originChain,
			notFinalStateTxHashes,
		);

		const updatedBridgeTransactions = updateBridgeTransactionStates(
			notFinalStateEntities,
			bridgingRequestStates,
		);

		await this.bridgeTransactionRepository.save(updatedBridgeTransactions);

		return {
			items: entities.map((entity) => this.mapToReponse(entity)),
			page: page,
			perPage: take,
			total: total,
		};
	}

	private mapToReponse(entity: BridgeTransaction): BridgeTransactionDto {
		const response = new BridgeTransactionDto();
		response.id = entity.id;
		response.senderAddress = entity.senderAddress;
		response.receiverAddress = entity.receiverAddress;
		response.destinationChain = entity.destinationChain;
		response.originChain = entity.originChain;
		response.amount = entity.amount;
		response.status = entity.status;
		response.createdAt = entity.createdAt;
		response.finishedAt = entity.finishedAt;
		return response;
	}
}
