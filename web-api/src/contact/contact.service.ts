import { Injectable } from '@nestjs/common';
import { CreateContactDto } from './contact.dto';
import { MailerService } from '@nestjs-modules/mailer';
import { AppConfigService } from 'src/appConfig/appConfig.service';

@Injectable()
export class ContactService {
	constructor(
		private readonly mailerService: MailerService,
		private readonly appConfig: AppConfigService,
	) {}

	async submitContactForm(contactData: CreateContactDto): Promise<void> {
		const { name, email, message } = contactData;
		await this.mailerService.sendMail({
			to: this.appConfig.email.contactEmail,
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
