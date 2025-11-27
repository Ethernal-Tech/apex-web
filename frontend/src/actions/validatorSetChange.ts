import { SettingsControllerClient } from '../swagger/apexBridgeApiService';
import { ErrorResponse, tryCatchJsonByAction } from '../utils/fetchUtils';

export const getReactorValidatorChangeStatusAction = async () => {
	const client = new SettingsControllerClient();
	return client.getReactorValidatorChange();
};

export const fetchAndUpdateReactorValidatorStatusAction = async () => {
	const validatorChangeStatusResp = await tryCatchJsonByAction(
		() => getReactorValidatorChangeStatusAction(),
		false,
	);
	if (validatorChangeStatusResp instanceof ErrorResponse) {
		throw new Error(
			`Error while fetching settings: ${validatorChangeStatusResp.err}`,
		);
	}

	return validatorChangeStatusResp.inProgress;
};
