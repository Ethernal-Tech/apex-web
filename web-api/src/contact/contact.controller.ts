import { Controller, Post, Body, HttpStatus, HttpCode } from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactDto } from './contact.dto';
import { ApiResponse, ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
	constructor(private readonly contactService: ContactService) {}

	@ApiOperation({
		summary: 'Submit a contact message',
		description:
			'Allows users to send a contact message by providing their name, email, and message.',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'OK - Message submitted.',
	})
	@HttpCode(HttpStatus.OK)
	@Post()
	submitContactForm(@Body() contactData: CreateContactDto): void {
		this.contactService.submitContactForm(contactData);
	}
}
