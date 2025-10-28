import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { winstonLogger } from './logger';
import { HttpExceptionFilter } from './utils/httpException.filter';
import { LoggingInterceptor } from './utils/logging.interceptor';
import { AppConfigService } from './appConfig/appConfig.service';

async function bootstrap() {
	const app = await NestFactory.create(AppModule, {
		autoFlushLogs: true,
		logger: winstonLogger,
	});

	const appSettings = app.get(AppConfigService);

	if (
		process.env.NODE_ENV === 'production' &&
		appSettings.corsAllowList !== undefined
	) {
		app.enableCors({ origin: appSettings.corsAllowList });
	} else {
		app.enableCors(); // Use default CORS settings
	}

	const config = new DocumentBuilder()
		.setTitle('Apex Web API')
		.setDescription('Apex Web  API description')
		.setVersion('1.0')
		.build();

	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('swagger', app, document);
	app.useGlobalPipes(new ValidationPipe());
	app.useGlobalFilters(new HttpExceptionFilter());
	app.useGlobalInterceptors(new LoggingInterceptor());

	const port = appSettings.port;

	await app.listen(port);
}
bootstrap();
