import {
	Injectable,
	NestInterceptor,
	ExecutionContext,
	CallHandler,
	Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
	constructor() {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const now = Date.now();
		const request = context.switchToHttp().getRequest();
		const { method, url, params, query } = request;

		const requestInfo = `Method: ${method} Path: ${url}, Query: ${JSON.stringify(query)}, Params: ${JSON.stringify(params)}`;
		Logger.debug(`Incoming request - ${requestInfo}`);

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
