import { Injectable } from '@nestjs/common';
import { GenerateLoginCodeDto, LoginCodeDto } from './auth.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { LoginCode } from './auth.entity';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
	constructor(
		@InjectRepository(LoginCode)
		private loginCodeRepository: Repository<LoginCode>,
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
}
