import {
	Injectable,
	NestInterceptor,
	ExecutionContext,
	CallHandler,
	Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request } from 'express';

export function formatRequestInfo(request: Request): string {
	const method = request.method ?? '';
	const parts = [
		`Method: ${method}`,
		`Path: ${request.url ?? ''}`,
		`Query: ${JSON.stringify(request.query ?? {})}`,
		`Params: ${JSON.stringify(request.params ?? {})}`,
	];

	if (method.toUpperCase() === 'POST') {
		parts.push(`Body: ${JSON.stringify(request.body ?? {})}`);
	}

	return parts.join(', ');
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
	constructor() {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const now = Date.now();
		const request = context.switchToHttp().getRequest<Request>();
		const requestInfo = formatRequestInfo(request);
		const isPost = (request.method ?? '').toUpperCase() === 'POST';

		if (isPost) {
			Logger.log(`Incoming request - ${requestInfo}`);
		} else {
			Logger.debug(`Incoming request - ${requestInfo}`);
		}

		return next.handle().pipe(
			tap(() => {
				const responseTime = Date.now() - now;
				Logger.debug(
					`Request Completed - ${requestInfo}, ResponseTime: ${responseTime}ms`,
				);
			}),
			catchError((error) => {
				const responseTime = Date.now() - now;
				Logger.debug(
					`Request Completed With Error - ${requestInfo}, ResponseTime: ${responseTime}ms`,
				);
				return throwError(() => error);
			}),
		);
	}
}
