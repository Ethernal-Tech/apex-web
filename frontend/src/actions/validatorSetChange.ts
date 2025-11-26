import { SettingsControllerClient } from '../swagger/apexBridgeApiService';
import { ErrorResponse, tryCatchJsonByAction } from '../utils/fetchUtils';

export const getValidatorChangeStatusAction = async () => {
	const client = new SettingsControllerClient();
	return client.getReactorValidatorChange();
};

export const fetchAndUpdateValidatorStatusAction = async () => {
	const validatorChangeStatusResp = await tryCatchJsonByAction(
		() => getValidatorChangeStatusAction(),
		false,
	);
	if (validatorChangeStatusResp instanceof ErrorResponse) {
		throw new Error(
			`Error while fetching settings: ${validatorChangeStatusResp.err}`,
		);
	}

	return validatorChangeStatusResp.inProgress;
};
