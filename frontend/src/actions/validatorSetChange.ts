import { SettingsControllerClient } from '../swagger/apexBridgeApiService';
import { ErrorResponse, tryCatchJsonByAction } from '../utils/fetchUtils';
import { retryForever } from '../utils/generalUtils';

const RETRY_DELAY_MS = 5000;

export const getValidatorChangeStatusAction = async () => {
	const client = new SettingsControllerClient();
	return client.getValidatorChange();
};

export const fetchAndUpdateValidatorStatusAction = async () => {
	const validatorChangeStatus = await retryForever(async () => {
		const validatorChangeStatusResp = await tryCatchJsonByAction(
			() => getValidatorChangeStatusAction(),
			false,
		);
		if (validatorChangeStatusResp instanceof ErrorResponse) {
			throw new Error(
				`Error while fetching settings: ${validatorChangeStatusResp.err}`,
			);
		}

		return validatorChangeStatusResp;
	}, RETRY_DELAY_MS);

	return validatorChangeStatus.inProgress;
};
