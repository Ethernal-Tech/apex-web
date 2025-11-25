import {
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	ParseArrayPipe,
	Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LockedTokensService } from './lockedTokens.service';
import { LockedTokensDto, TransferredTokensByDay } from './lockedTokens.dto';
import { BridgingModeEnum, GroupByTimePeriod } from 'src/common/enum';

@ApiTags('LockedTokens')
@Controller('lockedTokens')
export class LockedTokensController {
	constructor(private readonly lockedTokensService: LockedTokensService) {}

	@ApiOperation({
		summary: 'Get locked tokens amount',
		description:
			'Provide information to users about the amount of locked tokens',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'OK - Get locked tokens amount.',
		type: LockedTokensDto,
	})
	@HttpCode(HttpStatus.OK)
	@Get()
	@ApiQuery({
		name: 'allowedBridgingModes',
		required: false,
		isArray: true,
		enum: BridgingModeEnum,
		enumName: 'BridgingModeEnum',
		style: 'form',
		explode: false,
		description: 'all suported bridging modes that goes into sum',
	})
	async get(
		@Query(
			'allowedBridgingModes',
			new ParseArrayPipe({ items: String, separator: ',', optional: true }),
		)
		modes?: string[],
	): Promise<LockedTokensDto> {
		const allowedBridgingModes = (modes ?? []) as BridgingModeEnum[];

		return await this.lockedTokensService.fillTokensData(allowedBridgingModes);
	}

	@ApiOperation({
		summary: 'Get sum of transferred tokens per chain',
		description:
			'Returns the sum of tokens transferred per chain within the given date range.',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		type: TransferredTokensByDay,
		description: 'OK - Returns the sum of transferred tokens per chain.',
	})
	@ApiQuery({
		name: 'startDate',
		required: true,
		description: 'Start date in ISO format (e.g., 2024-01-01)',
	})
	@ApiQuery({
		name: 'endDate',
		required: true,
		description: 'End date in ISO format (e.g., 2024-12-31)',
	})
	@ApiQuery({
		name: 'groupBy',
		required: false,
		enum: GroupByTimePeriod,
		description:
			'Time period to group by: hour, day, week, or month (default is day)',
	})
	@ApiQuery({
		name: 'allowedBridgingModes',
		required: false,
		description: 'all suported bridging modes that goes into sum',
	})
	@ApiQuery({
		name: 'allowedBridgingModes',
		required: false,
		isArray: true,
		enum: BridgingModeEnum,
		enumName: 'BridgingModeEnum',
		style: 'form',
		explode: false,
	})
	@HttpCode(HttpStatus.OK)
	@Get('transferred')
	async getTransferredSum(
		@Query('startDate') startDateStr: string,
		@Query('endDate') endDateStr: string,
		@Query('groupBy') groupByStr: GroupByTimePeriod,
		@Query(
			'allowedBridgingModes',
			new ParseArrayPipe({ items: String, separator: ',', optional: true }),
		)
		modes?: string[],
	): Promise<TransferredTokensByDay[]> {
		const startDate = new Date(startDateStr);
		const endDate = new Date(endDateStr);

		const allowedBridgingModes = (modes ?? []) as BridgingModeEnum[];

		if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
			throw new Error(
				'Invalid date format. Please provide ISO strings for startDate and endDate.',
			);
		}

		const groupBy: GroupByTimePeriod = groupByStr ?? GroupByTimePeriod.Day;

		if (!Object.values(GroupByTimePeriod).includes(groupBy)) {
			throw new Error(
				`Invalid groupBy value. Expected one of: ${Object.values(GroupByTimePeriod).join(', ')}`,
			);
		}

		return await this.lockedTokensService.sumOfTransferredTokenByDate(
			startDate,
			endDate,
			groupBy,
			allowedBridgingModes,
		);
	}
}
