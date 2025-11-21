import { Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';

export const getValidatorChangeStatus = async () => {
	const reactorUrl = process.env.CARDANO_API_REACTOR_URL;
	const reactorApiKey =
		process.env.CARDANO_API_REACTOR_API_KEY || 'test_api_key';

	Logger.debug(`axios.get: ${reactorUrl}`);
	try {
		const response = await axios.get(reactorUrl!, {
			headers: {
				'X-API-KEY': reactorApiKey,
			},
		});

		Logger.debug(`axios.response: ${JSON.stringify(response.data)}`);
		return (response.data as { inProgress: boolean }).inProgress;
	} catch (e) {
		if (e instanceof AxiosError) {
			Logger.error(
				`Error while getBridgingRequestStates: ${e}. response: ${JSON.stringify(e.response?.data)}`,
				e.stack,
			);
		} else {
			Logger.error(`Error while getBridgingRequestStates: ${e}`, e.stack);
		}
		return false;
	}
};
