import { Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { getAppConfig } from 'src/appConfig/appConfig';

export const getValidatorChangeStatus = async () => {
	const oracleUrl = getAppConfig().oracleUrl;
	const oracleApiKey = process.env.ORACLE_API_KEY || 'test_api_key';
	const endpointUrl = oracleUrl + `/api/Settings/GetValidatorChangeStatus`;

	Logger.debug(`axios.get: ${endpointUrl}`);
	try {
		const response = await axios.get(endpointUrl, {
			headers: {
				'X-API-KEY': oracleApiKey,
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
