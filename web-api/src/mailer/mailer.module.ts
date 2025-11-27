import dotenv from 'dotenv';
import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { join } from 'path';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { AppConfigService } from 'src/appConfig/appConfig.service';

dotenv.config({ path: '.env' });

@Module({
	imports: [
		MailerModule.forRootAsync({
			inject: [AppConfigService],
			useFactory: (appConfig: AppConfigService) => ({
				transport: {
					host: appConfig.email.smtpHost,
					port: appConfig.email.smtpPort,
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
