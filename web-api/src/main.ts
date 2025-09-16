import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { winstonLogger } from './logger';
import { HttpExceptionFilter } from './utils/httpException.filter';
import { LoggingInterceptor } from './utils/logging.interceptor';
import { AppConfigService } from './config/config.service';

async function bootstrap() {
	const app = await NestFactory.create(AppModule, {
		autoFlushLogs: true,
		logger: winstonLogger,
	});

	const cfg = app.get(AppConfigService);

	if (
		process.env.NODE_ENV === 'production' &&
		cfg.corsAllowList !== undefined
	) {
		app.enableCors({ origin: cfg.corsAllowList });
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

	const port = cfg.port || 3500;

	await app.listen(port);
}
bootstrap();
