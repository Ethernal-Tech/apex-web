import { Injectable } from '@nestjs/common';
import { CreateContactDto } from './contact.dto';
import { MailerService } from '@nestjs-modules/mailer';
import { AppSettingsService } from 'src/appSettings/appSettings.service';

@Injectable()
export class ContactService {
	constructor(
		private readonly mailerService: MailerService,
		private readonly appSettings: AppSettingsService,
	) {}

	async submitContactForm(contactData: CreateContactDto): Promise<void> {
		const { name, email, message } = contactData;
		await this.mailerService.sendMail({
			to: this.appSettings.email.contactEmail,
			subject: `Reactor from ${name}`,
			template: 'contact',
			context: {
				name,
				email,
				message: message.replace(/\n/g, '<br>'),
			},
		});
	}
}
