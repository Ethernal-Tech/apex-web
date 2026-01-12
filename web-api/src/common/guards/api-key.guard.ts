import {
	Injectable,
	CanActivate,
	ExecutionContext,
	UnauthorizedException,
} from '@nestjs/common';
import { AppConfigService } from 'src/appConfig/appConfig.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
	constructor(private readonly appConfigService: AppConfigService) {}

	canActivate(context: ExecutionContext): boolean {
		const request = context.switchToHttp().getRequest();

		// if there are no api keys defined, just let the request pass through
		if (
			this.appConfigService.secrets.apiKeys === undefined ||
			this.appConfigService.secrets.apiKeys.length === 0
		) {
			return true;
		}

		const apiKey = request.headers['x-api-key'];

		if (!apiKey) {
			throw new UnauthorizedException('API key is missing');
		}

		const validApiKeys = this.appConfigService.secrets.apiKeys;

		for (const validKey of validApiKeys) {
			if (apiKey === validKey) {
				return true;
			}
		}

		throw new UnauthorizedException('Invalid API key');
	}
}
