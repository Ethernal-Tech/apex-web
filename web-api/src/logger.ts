import { utilities, WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

export const drfTransport = new winston.transports.DailyRotateFile({
	format: winston.format.combine(
		winston.format.timestamp(),
		utilities.format.nestLike(),
		winston.format.uncolorize(),
	),
	filename: 'logs/web-api-%DATE%.log',
	datePattern: 'YYYY-MM-DD',
	zippedArchive: true,
	handleExceptions: true,
	handleRejections: true,
});

export const winstonLogger = WinstonModule.createLogger({
	exceptionHandlers: [drfTransport],
	handleExceptions: true,
	handleRejections: true,
	exitOnError: false,
	level: 'debug',
	format: winston.format.errors({ stack: true }),
	transports: [
		new winston.transports.Console({
			format: winston.format.combine(
				winston.format.timestamp(),
				utilities.format.nestLike(),
			),
		}),
		drfTransport,
	],
});
