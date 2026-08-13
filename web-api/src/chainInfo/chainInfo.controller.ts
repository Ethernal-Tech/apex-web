import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChainInfosResponseDto } from './chainInfo.dto';
import { ChainInfosRegistry } from './chainInfos.registry';

@ApiTags('ChainInfo')
@Controller('chainInfo')
export class ChainInfoController {
	constructor(private readonly registry: ChainInfosRegistry) {}

	@ApiOperation({
		summary: 'Get chain display metadata',
		description:
			'Returns the accent color of each chain, so the UI does not have to ' +
			'hardcode a palette. The list comes from a config file of the network ' +
			'this instance serves, re-read on change - recoloring a chain needs a ' +
			'config edit only, no frontend rebuild and no redeploy.',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'OK - Chain display metadata.',
		type: ChainInfosResponseDto,
	})
	@HttpCode(HttpStatus.OK)
	@Get()
	get(): ChainInfosResponseDto {
		const unknownChain = this.registry.getUnknownChain();

		return {
			network: this.registry.network,
			chains: [...this.registry.getChains()],
			...(unknownChain ? { unknownChain } : {}),
		};
	}
}
