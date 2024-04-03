import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
	GenerateLoginCodeDto,
	LoginCodeDto,
	LoginDto,
	TokenDto,
} from './auth.dto';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@ApiResponse({
		status: HttpStatus.OK,
		type: LoginCodeDto,
		description: 'Success',
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Bad Request',
	})
	@HttpCode(HttpStatus.OK)
	@Post('generateLoginCode')
	async generateLoginCode(
		@Body() model: GenerateLoginCodeDto,
	): Promise<LoginCodeDto> {
		const result = await this.authService.generateLoginCode(model);
		return result;
	}

	@ApiResponse({
		status: HttpStatus.OK,
		type: TokenDto,
		description: 'Success',
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Bad Request',
	})
	@HttpCode(HttpStatus.OK)
	@Post('login')
	async login(@Body() model: LoginDto): Promise<TokenDto> {
		const result = await this.authService.login(model);
		return result;
	}
}
