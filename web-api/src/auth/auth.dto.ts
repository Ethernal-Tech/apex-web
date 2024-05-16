import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ChainEnum } from 'src/common/enum';

export class GenerateLoginCodeDto {
	@IsNotEmpty()
	@IsString()
	@ApiProperty()
	address: string;

	@IsNotEmpty()
	@IsEnum(ChainEnum)
	@ApiProperty()
	chainID: ChainEnum;
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

	@IsNotEmpty()
	@IsEnum(ChainEnum)
	@ApiProperty()
	chainID: ChainEnum;
}

export class DataSignatureDto {
	@IsNotEmpty()
	@IsString()
	@ApiProperty()
	signature: string;

	@IsNotEmpty()
	@IsString()
	@ApiProperty()
	key: string;
}

export class LoginDto {
	@IsNotEmpty()
	@IsString()
	@ApiProperty()
	address: string;

	@IsNotEmpty()
	@ApiProperty({ type: () => DataSignatureDto })
	signedLoginCode: DataSignatureDto;

	@IsNotEmpty()
	@IsEnum(ChainEnum)
	@ApiProperty()
	chainID: ChainEnum;
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

	@IsNotEmpty()
	@IsEnum(ChainEnum)
	@ApiProperty()
	chainID: ChainEnum;
}
