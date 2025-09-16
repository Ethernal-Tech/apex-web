import { Injectable } from '@nestjs/common';
import { CreateContactDto } from './contact.dto';
import { MailerService } from '@nestjs-modules/mailer';
import { AppConfigService } from 'src/config/config.service';

@Injectable()
export class ContactService {
	constructor(
		private readonly mailerService: MailerService,
		private readonly cfg: AppConfigService,
	) {}

	async submitContactForm(contactData: CreateContactDto): Promise<void> {
		const { name, email, message } = contactData;
		await this.mailerService.sendMail({
			to: this.cfg.email.contactEmail || 'info@ethernal.tech',
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
