import { Test, TestingModule } from '@nestjs/testing';
import { BridgeTransactionService } from './bridgeTransaction.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BridgeTransaction } from './bridgeTransaction.entity';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ChainApexBridgeEnum, TransactionStatusEnum } from '../common/enum';
import { SchedulerRegistry } from '@nestjs/schedule';
import { BridgeTransactionFilterDto } from './bridgeTransaction.dto';
import { SettingsService } from 'src/settings/settings.service';
import { AppConfigService } from 'src/appConfig/appConfig.service';

describe('BridgeTransactionService', () => {
	let service: BridgeTransactionService;
	let bridgeTransactionRepository: Repository<BridgeTransaction>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				BridgeTransactionService,
				{
					provide: getRepositoryToken(BridgeTransaction),
					useClass: Repository,
				},
				{
					provide: SettingsService,
					useValue: { getCronJob: jest.fn() },
				},
				{
					provide: SchedulerRegistry,
					useValue: { getCronJob: jest.fn() },
				},
				{
					provide: AppConfigService,
					useValue: { getCronJob: jest.fn() },
				},
			],
		}).compile();

		service = module.get<BridgeTransactionService>(BridgeTransactionService);
		bridgeTransactionRepository = module.get<Repository<BridgeTransaction>>(
			getRepositoryToken(BridgeTransaction),
		);
	});

	describe('get', () => {
		it('should return the transaction dto if the entity is found', async () => {
			const transaction = new BridgeTransaction();
			transaction.id = 1;
			transaction.senderAddress =
				'addr_test1qqafaqcjl0gfgus77h37dm86z2k00tptt7fhxc205tk5xgnvvehq7dfv0fmfq9dh9d7cjpa6qll0khnqkue77hs0gldsnrhk04';
			transaction.receiverAddresses =
				'vector_test1v2xmn45jpn26wrwvlveuvryw4g8nm78m52eh4k5uzf7630gakk0rm';
			transaction.originChain = ChainApexBridgeEnum.Prime;
			transaction.destinationChain = ChainApexBridgeEnum.Vector;
			transaction.amount = BigInt(100).toString();
			transaction.nativeTokenAmount = BigInt(0).toString();
			transaction.sourceTxHash = 'sourceTxHash';
			transaction.destinationTxHash = 'destinationTxHash';
			transaction.status = TransactionStatusEnum.ExecutedOnDestination;
			transaction.createdAt = new Date();
			transaction.finishedAt = new Date();

			jest
				.spyOn(bridgeTransactionRepository, 'findOne')
				.mockResolvedValue(transaction);

			const result = await service.get(1);

			expect(result).toBeDefined();
			expect(result.senderAddress).toBe(
				'addr_test1qqafaqcjl0gfgus77h37dm86z2k00tptt7fhxc205tk5xgnvvehq7dfv0fmfq9dh9d7cjpa6qll0khnqkue77hs0gldsnrhk04',
			);
		});

		it('should throw NotFoundException if the entity is not found', async () => {
			jest
				.spyOn(bridgeTransactionRepository, 'findOne')
				.mockResolvedValue(null);

			await expect(service.get(1)).rejects.toThrow(NotFoundException);
		});
	});

	describe('getAllFiltered', () => {
		it('should return the filtered transactions', async () => {
			const filterDto: BridgeTransactionFilterDto = {
				originChain: ChainApexBridgeEnum.Prime,
				destinationChain: ChainApexBridgeEnum.Vector,
				senderAddress:
					'addr_test1qqafaqcjl0gfgus77h37dm86z2k00tptt7fhxc205tk5xgnvvehq7dfv0fmfq9dh9d7cjpa6qll0khnqkue77hs0gldsnrhk04',
			};

			const transactions = [new BridgeTransaction(), new BridgeTransaction()];
			jest
				.spyOn(bridgeTransactionRepository, 'findAndCount')
				.mockResolvedValue([transactions, 2]);

			const result = await service.getAllFiltered(filterDto);

			expect(result.items.length).toBe(2);
			expect(result.total).toBe(2);
		});

		it('should return an empty list when no transactions are found', async () => {
			const filterDto: BridgeTransactionFilterDto = {
				originChain: ChainApexBridgeEnum.Prime,
				destinationChain: ChainApexBridgeEnum.Vector,
				senderAddress:
					'addr_test1qqafaqcjl0gfgus77h37dm86z2k00tptt7fhxc205tk5xgnvvehq7dfv0fmfq9dh9d7cjpa6qll0khnqkue77hs0gldsnrhk04',
			};

			jest
				.spyOn(bridgeTransactionRepository, 'findAndCount')
				.mockResolvedValue([[], 0]);

			const result = await service.getAllFiltered(filterDto);

			expect(result.items.length).toBe(0);
			expect(result.total).toBe(0);
		});
	});
});
