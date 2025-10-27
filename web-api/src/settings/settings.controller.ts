import {
	BadRequestException,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Logger,
	Query,
} from '@nestjs/common';
import { ApiResponse, ApiTags, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import {
	AllBridgingAddressesDto,
	SettingsFullResponseDto,
} from './settings.dto';
import axios, { AxiosError } from 'axios';
import { ErrorResponseDto } from 'src/transaction/transaction.dto';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
	constructor(private readonly settingsService: SettingsService) {}

	@ApiOperation({
		summary: 'Get bridge settings',
		description:
			'Returns the participating chains with their specific settings, global bridge configuration (such as minimum and maximum allowed bridging amounts), and, for each source chain, the native token that will be received on the destination chain.',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		type: SettingsFullResponseDto,
		description: 'OK - Returns the configuration settings.',
	})
	@HttpCode(HttpStatus.OK)
	@Get()
	get(): SettingsFullResponseDto {
		return this.settingsService.SettingsResponse;
	}

	@ApiOperation({
		summary: 'Get all bridging addresses',
		description: 'Get all bridging addresses for a chain',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'OK - Get bridging addresses.',
		type: AllBridgingAddressesDto,
	})
	@HttpCode(HttpStatus.OK)
	@Get('getBridgingAddresses')
	async getBridgingAddresses(
		@Query('chainId') chainId: string,
	): Promise<AllBridgingAddressesDto> {
		const apiKey = process.env.CARDANO_API_SKYLINE_API_KEY;
		const endpointUrl =
			process.env.CARDANO_API_SKYLINE_URL +
			`/api/CardanoTx/GetBridgingAddresses?chainId=${chainId}`;

		Logger.debug(`axios.get: ${endpointUrl}`);

		try {
			const response = await axios.get(endpointUrl, {
				headers: {
					'X-API-KEY': apiKey,
					'Content-Type': 'application/json',
				},
			});

			Logger.debug(`axios.response: ${JSON.stringify(response.data)}`);

			return response.data as AllBridgingAddressesDto;
		} catch (error) {
			if (error instanceof AxiosError) {
				if (error.response) {
					throw new BadRequestException(
						error.response.data as ErrorResponseDto,
					);
				}
			}

			throw new BadRequestException();
		}
	}
}
