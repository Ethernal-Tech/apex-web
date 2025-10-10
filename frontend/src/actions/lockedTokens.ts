import { Dispatch } from "@reduxjs/toolkit";
import {
  BridgingModeEnum,
  LockedTokensControllerClient,
} from "../swagger/apexBridgeApiService";
import { ErrorResponse, tryCatchJsonByAction } from "../utils/fetchUtils";
import { setLockedTokensAction } from "../redux/slices/lockedTokensSlice";
import { toast } from "react-toastify";

export const getLockedTokensAction = async () => {
  const client = new LockedTokensControllerClient();
  return client.get([BridgingModeEnum.Skyline]);
};

export const fetchAndUpdateLockedTokensAction = async (dispatch: Dispatch) => {
  const lockedTokensResp = await tryCatchJsonByAction(
    () => getLockedTokensAction(),
    false
  );

  if (lockedTokensResp instanceof ErrorResponse) {
    toast(`Error while fetching settings: ${lockedTokensResp.err}`);
    return;
  }

  dispatch(setLockedTokensAction(lockedTokensResp));
};
