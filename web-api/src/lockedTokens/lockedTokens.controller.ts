import { Body, Controller, Get, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { LockedTokensService } from "./lockedTokens.service";
import { LockedTokensDto } from "./lockedTokens.dto";

@ApiTags('LockedTokens')
@Controller('lockedTokens')
export class LockedTokensController{
        constructor(private readonly lockedTokensService: LockedTokensService) {}
    
        @ApiOperation({
            summary: 'Get locked tokens amount',
            description:
                'Provide information to users about the amount of locked tokens',
        })
        @ApiResponse({
            status: HttpStatus.OK,
            description: 'OK - Get locked tokens amount.',
        })
        @HttpCode(HttpStatus.OK)
        @Get()
        async get(): Promise<LockedTokensDto> {
            return this.lockedTokensService.LockedTokensResponse
        }
}