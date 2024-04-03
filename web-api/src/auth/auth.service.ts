import { BadRequestException, Injectable } from '@nestjs/common';
import {
	DataSignatureDto,
	GenerateLoginCodeDto,
	LoginCodeDto,
	LoginDto,
	TokenDto,
} from './auth.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { LoginCode, User } from './auth.entity';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
	constructor(
		@InjectRepository(LoginCode)
		private readonly loginCodeRepository: Repository<LoginCode>,
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
		private readonly configService: ConfigService,
		private readonly jwtService: JwtService,
	) {}
	async generateLoginCode({
		address,
	}: GenerateLoginCodeDto): Promise<LoginCodeDto> {
		const oldCode = await this.loginCodeRepository.findOneBy({
			address: address.toLowerCase(),
		});
		if (oldCode !== null) {
			await this.loginCodeRepository.delete(oldCode);
		}
		const code = this.loginCodeRepository.create({
			address: address.toLowerCase(),
			code: randomUUID(),
		});

		await this.loginCodeRepository.save(code);
		return new LoginCodeDto(code);
	}

	async login(model: LoginDto): Promise<TokenDto> {
		const loginCode = await this.loginCodeRepository.findOneBy({
			address: model.address.toLowerCase(),
		});
		if (!loginCode) {
			throw new BadRequestException();
		}

		if (
			!this.verifySignedCode(
				loginCode.address,
				loginCode.code,
				model.signedLoginCode,
			)
		) {
			throw new BadRequestException();
		}

		let user = await this.userRepository.findOneBy({
			address: loginCode.address.toLowerCase(),
		});

		if (!user) {
			user = this.userRepository.create({
				address: loginCode.address.toLowerCase(),
				createdAt: new Date(),
			});
		}

		await this.loginCodeRepository.remove(loginCode);

		const response = new TokenDto();
		response.address = user.address;
		const tokenValidHours = +this.configService.get<number>(
			'APP_ACCESS_TOKEN_VALIDITY_HOURS',
		)!;
		const currentDate = new Date();
		const expiresIn = currentDate.setHours(
			currentDate.getHours() + tokenValidHours,
		);
		const secret = this.configService.get('APP_SECRET');
		response.token = this.jwtService.sign({ user }, { secret, expiresIn });
		response.expiresAt = new Date(expiresIn);

		return response;
	}

	private verifySignedCode(
		address: string,
		code: string,
		signedCode: DataSignatureDto,
	) {
		// TODO: implement verify
		return address && code && signedCode;
	}
}
