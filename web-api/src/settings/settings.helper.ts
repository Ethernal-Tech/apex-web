import { Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';

export const getReactorValidatorChangeStatus = async () => {
	const endpointUrl =
		process.env.ORACLE_REACTOR_URL + `/api/Settings/GetValidatorChangeStatus`;
	const reactorApiKey = process.env.ORACLE_REACTOR_API_KEY || 'test_api_key';

	Logger.debug(`axios.get: ${endpointUrl}`);
	try {
		const response = await axios.get(endpointUrl!, {
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
