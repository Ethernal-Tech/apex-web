import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChainEnum } from 'src/common/enum';
import { AddressBalanceDto } from './balance.dto';
import { BalanceService } from './balance.service';

@ApiTags('Balance')
@Controller('balance')
export class BalanceController {
	constructor(private readonly balanceService: BalanceService) {}

	@ApiOperation({
		summary: 'Get address balance',
		description:
			'Returns the native balance (and optional token balances) for an address on the given chain. ' +
			'EVM/Solana are queried via RPC; Cardano-family chains are proxied to cardano-api GetBalance.',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'OK - Address balance.',
		type: AddressBalanceDto,
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Invalid chain/address or upstream balance lookup failed.',
	})
	@ApiQuery({
		name: 'chain',
		required: true,
		enum: ChainEnum,
		enumName: 'ChainEnum',
	})
	@ApiQuery({
		name: 'address',
		required: true,
		type: String,
	})
	@ApiQuery({
		name: 'tokens',
		required: false,
		type: String,
		description:
			'Comma-separated token ids. EVM: ERC-20 contracts. Solana: mint addresses (omit = all SPL). Cardano: ignored.',
	})
	@HttpCode(HttpStatus.OK)
	@Get()
	async get(
		@Query('chain') chain: string,
		@Query('address') address: string,
		@Query('tokens') tokens?: string,
	): Promise<AddressBalanceDto> {
		return this.balanceService.getAddressBalance(chain, address, tokens);
	}
}
