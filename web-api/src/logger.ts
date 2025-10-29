import { utilities, WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { getAppConfig } from './appConfig/appConfig';

const appConfig = getAppConfig();

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
	level: appConfig.logLevel,
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

/*
LOG LEVELS:
{
	emerg: 0,
	alert: 1,
	crit: 2,
	error: 3,
	warning: 4,
	notice: 5,
	info: 6,
	debug: 7
}
*/
