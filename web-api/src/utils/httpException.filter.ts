import {
	ExceptionFilter,
	Catch,
	ArgumentsHost,
	HttpException,
	Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
	constructor() {}

	catch(exception: HttpException, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
		const request = ctx.getRequest<Request>();
		const status = exception.getStatus();

		Logger.error(
			`Exception intercepted - Path: ${request.url}, Status: ${status}, ex: ${JSON.stringify(exception)}`,
			exception.stack,
		);

		let error = exception.name;
		try {
			const eResponseStr = exception.getResponse();
			const eResponse =
				typeof eResponseStr == 'string'
					? JSON.parse(eResponseStr)
					: eResponseStr;
			error = eResponse.error || eResponse.err;
		} catch (e) {
			Logger.error(
				`Failed to parse exception intercepted - ex: ${JSON.stringify(error)}, e: ${JSON.stringify(e)}`,
				e.stack,
			);
		}

		response.status(status).json({
			statusCode: status,
			message: exception.message,
			error,
		});
	}
}
