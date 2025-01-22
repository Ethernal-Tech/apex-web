import { Injectable } from '@nestjs/common';
import { CreateContactDto } from './contact.dto';
import { MailerService } from '@nestjs-modules/mailer';
import { getTestMessageUrl } from 'nodemailer';

@Injectable()
export class ContactService {
	constructor(private readonly mailerService: MailerService) {}

	async submitContactForm(contactData: CreateContactDto): Promise<void> {
		const { name, email, message } = contactData;
		const messageInfo = await this.mailerService.sendMail({
			to: 'info@ethernal.tech',
			subject: `Skyline from ${name}`,
			template: 'contact',
			context: {
				name,
				email,
				message: message.replace(/\n/g, '<br>'),
			},
		});

		console.log('Preview URL: ', getTestMessageUrl(messageInfo));
	}
}
