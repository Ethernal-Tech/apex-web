import { Injectable } from '@nestjs/common';
import { CreateContactDto } from './contact.dto';
import { MailerService } from '@nestjs-modules/mailer';
import { getAppConfig } from 'src/appConfig/appConfig';

@Injectable()
export class ContactService {
	constructor(private readonly mailerService: MailerService) {}

	async submitContactForm(contactData: CreateContactDto): Promise<void> {
		const { name, email, message } = contactData;
		await this.mailerService.sendMail({
			to: getAppConfig().email.contactEmail,
			subject: `Skyline from ${name}`,
			template: 'contact',
			context: {
				name,
				email,
				message: message.replace(/\n/g, '<br>'),
			},
		});
	}
}
