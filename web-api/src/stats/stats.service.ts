import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { LandingStatsDto } from './stats.dto';

@Injectable()
export class StatsService {
	constructor(
		@InjectRepository(BridgeTransaction)
		private readonly bridgeTransactionRepository: Repository<BridgeTransaction>,
	) {}

	async getLandingStats(): Promise<LandingStatsDto> {
		const bridgingTransactions = await this.bridgeTransactionRepository.count();

		return { bridgingTransactions };
	}
}
