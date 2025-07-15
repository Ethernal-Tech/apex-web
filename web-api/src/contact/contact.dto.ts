import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateContactDto {
	@IsNotEmpty()
	@IsString()
	@ApiProperty({
		description: 'Full name of the user submitting the message',
	})
	name: string;

	@IsNotEmpty()
	@IsEmail()
	@ApiProperty({
		description: 'Email address of the user submitting the message',
		format: 'email',
	})
	email: string;

	@IsNotEmpty()
	@IsString()
	@ApiProperty({
		description: 'Message to be submitted',
	})
	message: string;
}
