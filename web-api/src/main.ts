import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

const port = process.env.PORT || 3500;

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	if (
		process.env.NODE_ENV === 'production' &&
		process.env.CORS_ALLOW_LIST !== undefined
	) {
		const corsAllowList = process.env.CORS_ALLOW_LIST;
		const corsOptions = { origin: corsAllowList.split(',') };
		app.enableCors(corsOptions);
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
	await app.listen(port);
}
bootstrap();
