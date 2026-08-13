import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TokenInfosResponseDto } from './tokenInfo.dto';
import { TokenInfosRegistry } from './tokenInfos.registry';

@ApiTags('TokenInfo')
@Controller('tokenInfo')
export class TokenInfoController {
	constructor(private readonly registry: TokenInfosRegistry) {}

	@ApiOperation({
		summary: 'Get token display metadata',
		description:
			'Returns the label, icon key and accent color for each bridge token ID, ' +
			'so the UI does not have to hardcode them. ' +
			'The list comes from a config file of the network this instance serves, ' +
			're-read on change - a new token needs a config edit only, no frontend ' +
			'rebuild and no redeploy.',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'OK - Token display metadata.',
		type: TokenInfosResponseDto,
	})
	@HttpCode(HttpStatus.OK)
	@Get()
	get(): TokenInfosResponseDto {
		return {
			network: this.registry.network,
			tokens: [...this.registry.getTokens()],
			unknownToken: this.registry.getUnknownToken(),
		};
	}
}
