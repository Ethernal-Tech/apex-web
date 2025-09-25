import dotenv from 'dotenv';
import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { join } from 'path';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { AppSettingsService } from 'src/appSettings/appSettings.service';

dotenv.config({ path: '.env' });

@Module({
	imports: [
		MailerModule.forRootAsync({
			inject: [AppSettingsService],
			useFactory: (appSettings: AppSettingsService) => ({
				transport: {
					host: appSettings.email.smtpHost,
					port: appSettings.email.smtpPort || 465,
					secure: true,
					auth: {
						user: process.env.SMTP_USER,
						pass: process.env.SMTP_PASS,
					},
				},
				defaults: {
					from: process.env.SMTP_USER,
				},
				template: {
					dir: join(__dirname, './templates'),
					adapter: new HandlebarsAdapter(),
					options: {
						strict: true,
					},
				},
			}),
		}),
	],
	exports: [MailerModule],
})
export class MailerConfigModule {}
