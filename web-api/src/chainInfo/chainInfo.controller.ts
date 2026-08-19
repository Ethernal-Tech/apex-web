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
			'Returns how each chain is presented - accent color, name, logo file name, ' +
			'list order, family and native symbol - so the UI does not have to hardcode ' +
			'any of it. Logos themselves are served by this API under /icons/chains/. ' +
			'The list comes from a config file of the network this ' +
			'instance serves, re-read on change, so restyling or renaming a chain ' +
			'needs a config edit only, no frontend rebuild and no redeploy.',
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
