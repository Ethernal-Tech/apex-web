import { Dispatch } from "@reduxjs/toolkit";
import { LockedTokensControllerClient } from "../swagger/apexBridgeApiService";
import { retryForever } from "../utils/generalUtils";
import { ErrorResponse, tryCatchJsonByAction } from "../utils/fetchUtils";
import { setLockedTokensAction } from "../redux/slices/lockedTokensSlice";

const RETRY_DELAY_MS = 5000;

export const getLockedTokensAction = async () => {
  const client = new LockedTokensControllerClient();
  return client.get();
};

export const fetchAndUpdateLockedTokensAction = async (dispatch: Dispatch) => {
  const lockedTokensResp = await tryCatchJsonByAction(
    () => getLockedTokensAction(),
    false
  );

  if (lockedTokensResp instanceof ErrorResponse) {
    throw new Error(`Error while fetching settings: ${lockedTokensResp.err}`);
  }

  dispatch(setLockedTokensAction(lockedTokensResp));
};
