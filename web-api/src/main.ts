import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { winstonLogger } from './logger';
import { HttpExceptionFilter } from './utils/httpException.filter';
import { LoggingInterceptor } from './utils/logging.interceptor';
import { getAppConfig } from './appConfig/appConfig';

async function bootstrap() {
	const app = await NestFactory.create(AppModule, {
		autoFlushLogs: true,
		logger: winstonLogger,
	});

	const appConfig = getAppConfig();

	if (
		process.env.NODE_ENV === 'production' &&
		appConfig.corsAllowList?.length > 0
	) {
		const corsOptions = { origin: appConfig.corsAllowList };
		app.enableCors(corsOptions);
	} else {
		app.enableCors(); // Use default CORS settings
	}

	// Swagger configuration
	if (process.env.NODE_ENV !== 'production') {
		const config = new DocumentBuilder()
			.setTitle('Apex Web API')
			.setDescription('Apex Web  API description')
			.setVersion('1.0')
			.build();

		const document = SwaggerModule.createDocument(app, config);
		SwaggerModule.setup('swagger', app, document);
	}

	app.useGlobalPipes(new ValidationPipe());
	app.useGlobalFilters(new HttpExceptionFilter());
	app.useGlobalInterceptors(new LoggingInterceptor());

	await app.listen(appConfig.port);
}
bootstrap();
