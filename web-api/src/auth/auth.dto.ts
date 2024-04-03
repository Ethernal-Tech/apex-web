import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateLoginCodeDto {
	@IsNotEmpty()
	@IsString()
	@ApiProperty()
	address: string;
}

export class LoginCodeDto {
	constructor(loginCode: LoginCodeDto) {
		this.address = loginCode.address;
		this.code = loginCode.code;
	}

	@IsNotEmpty()
	@IsString()
	@ApiProperty()
	address: string;

	@IsNotEmpty()
	@IsString()
	@ApiProperty()
	code: string;
}
