import { Dispatch } from '@reduxjs/toolkit';
import { SettingsControllerClient } from '../swagger/apexBridgeApiService';
import { ErrorResponse, tryCatchJsonByAction } from '../utils/fetchUtils';
import { setValidatorStatus } from '../redux/slices/settingsSlice';

export const getValidatorChangeStatusAction = async () => {
	const client = new SettingsControllerClient();
	return client.getValidatorChange();
};

export const fetchAndUpdateValidatorStatusAction = async (
	dispatch: Dispatch,
) => {
	const validatorChangeStatusResp = await tryCatchJsonByAction(
		() => getValidatorChangeStatusAction(),
		false,
	);
	if (validatorChangeStatusResp instanceof ErrorResponse) {
		console.log(
			`Error while fetching reactor validator status: ${validatorChangeStatusResp}`,
		);

		return;
	}

	dispatch(setValidatorStatus(validatorChangeStatusResp.inProgress));
};
