import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsNotEmpty, IsString } from 'class-validator';

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

export class LoginDto {
	@IsNotEmpty()
	@IsString()
	@ApiProperty()
	address: string;

	@IsNotEmpty()
	@IsString()
	@ApiProperty()
	signedLoginCode: string;
}

export class TokenDto {
	@IsNotEmpty()
	@IsString()
	@ApiProperty()
	address: string;

	@IsNotEmpty()
	@IsString()
	@ApiProperty()
	token: string;

	@IsNotEmpty()
	@IsDate()
	@ApiProperty()
	expiresAt: Date;
}
