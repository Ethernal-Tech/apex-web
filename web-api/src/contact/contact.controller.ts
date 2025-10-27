import { Controller, Post, Body, HttpStatus, HttpCode } from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactDto } from './contact.dto';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
	constructor(private readonly contactService: ContactService) {}

	@ApiResponse({
		status: HttpStatus.OK,
		description: 'Success',
	})
	@HttpCode(HttpStatus.OK)
	@Post()
	submitContactForm(@Body() contactData: CreateContactDto): void {
		this.contactService.submitContactForm(contactData);
	}
}
