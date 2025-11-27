import { Dispatch } from '@reduxjs/toolkit';
import { setReactorValidatorStatus } from '../redux/slices/settingsSlice';
import { SettingsControllerClient } from '../swagger/apexBridgeApiService';
import { ErrorResponse, tryCatchJsonByAction } from '../utils/fetchUtils';

export const getReactorValidatorChangeStatusAction = () => {
	const client = new SettingsControllerClient();
	return client.getReactorValidatorChange();
};

export const fetchAndUpdateReactorValidatorStatusAction = async (
	dispatch: Dispatch,
) => {
	const validatorChangeStatusResp = await tryCatchJsonByAction(
		() => getReactorValidatorChangeStatusAction(),
		false,
	);
	if (validatorChangeStatusResp instanceof ErrorResponse) {
		console.log(
			`Error while fetching reactor validator status: ${validatorChangeStatusResp}`,
		);

		return;
	}

	dispatch(setReactorValidatorStatus(validatorChangeStatusResp.inProgress));
};
