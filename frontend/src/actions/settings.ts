import { Dispatch } from '@reduxjs/toolkit';
import { SettingsControllerClient } from '../swagger/apexBridgeApiService';
import { ErrorResponse, tryCatchJsonByAction } from '../utils/fetchUtils';
import { retryForever } from '../utils/generalUtils';
import { setSettingsAction } from '../redux/slices/settingsSlice';

const RETRY_DELAY_MS = 5000;

export const getSettingsAction = async () => {
	const client = new SettingsControllerClient();
	return client.get();
};

export const fetchAndUpdateSettingsAction = async (dispatch: Dispatch) => {
	const settings = await retryForever(async () => {
		const settingsResp = await tryCatchJsonByAction(
			() => getSettingsAction(),
			false,
		);
		if (settingsResp instanceof ErrorResponse) {
			throw new Error(
				`Error while fetching settings: ${settingsResp.err}`,
			);
		}

		return settingsResp;
	}, RETRY_DELAY_MS);

	dispatch(setSettingsAction(settings));
};
