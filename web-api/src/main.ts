import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { winstonLogger } from './logger';
import { HttpExceptionFilter } from './utils/httpException.filter';
import { LoggingInterceptor } from './utils/logging.interceptor';
import { getAppConfig } from './appConfig/appConfig';
import {
	ICONS_URL_PREFIX,
	resolveIconsDir,
} from './appConfig/appConfig.helper';

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule, {
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

	/**
	 * Chain and token logos, named by the "icon" field of the chainInfos and
	 * tokenInfos configs. Static middleware answers before Nest routing, so these
	 * are deliberately outside the global ApiKeyGuard - a browser <img> request
	 * cannot carry an x-api-key header. fallthrough:false keeps a missing file a
	 * 404 here rather than letting it reach that guard and come back a 401.
	 *
	 * The configs name plain file names, so updating a logo means overwriting the
	 * file it points at - which rules out immutable caching. An hour of freshness
	 * keeps the steady state at zero requests, and the ETag express.static sends
	 * makes the hourly recheck a 304 with no body. A config can force a logo
	 * through sooner by appending a query to the name ("prime.svg?v=2" is a new
	 * URL to the browser and the same file here).
	 */
	const iconsDir = resolveIconsDir();
	app.useStaticAssets(iconsDir, {
		prefix: ICONS_URL_PREFIX,
		maxAge: '1h',
		index: false,
		redirect: false,
		fallthrough: false,
		dotfiles: 'deny',
		setHeaders: (res) => {
			// an SVG is an active-content format and these are same-origin with the
			// API, so it must never be sniffed as anything else or run scripts
			res.setHeader('X-Content-Type-Options', 'nosniff');
			res.setHeader('Content-Security-Policy', "default-src 'none'");
		},
	});
	Logger.log(`Serving icons from ${iconsDir} at ${ICONS_URL_PREFIX}`);

	await app.listen(appConfig.port);
}
bootstrap();
