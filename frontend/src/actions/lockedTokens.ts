import { Dispatch } from "@reduxjs/toolkit";
import {
  BridgingModeEnum,
  ChainEnum,
  LockedTokensControllerClient,
} from "../swagger/apexBridgeApiService";
import { ErrorResponse, tryCatchJsonByAction } from "../utils/fetchUtils";
import { setLockedTokensAction } from "../redux/slices/lockedTokensSlice";
import { toast } from "react-toastify";
import { CHAIN_URLS } from "../utils/chainUtils";
import Web3 from "web3";
import { LayerZeroChains } from "../settings/settingsRedux";

async function readErc20Meta(
  rpcUrl: string,
  tokenAddress: string
): Promise<bigint> {
  const web3 = new Web3(rpcUrl);

  let totalRaw: unknown = "0";

  try {
    totalRaw = await web3.eth.getBalance(tokenAddress);

    console.log("Locked tokens LayerZero Token on Nexus: ", totalRaw);
  } catch {}

  const raw = BigInt(String(totalRaw ?? "0"));
  return raw;
}

export async function getLayerZeroLockedTokens(
  lzChain: LayerZeroChains
): Promise<bigint> {
  let out = BigInt(0);

  const lzSettings = lzChain[ChainEnum.Nexus];

  if (lzSettings) {
      out = await readErc20Meta(
        CHAIN_URLS[ChainEnum.Nexus],
        lzSettings.oftAddress
      );
  }

  return out;
}

export const getLockedTokensAction = async () => {
  const client = new LockedTokensControllerClient();
  return client.get([BridgingModeEnum.Skyline]);
};

export const fetchAndUpdateLockedTokensAction = async (dispatch: Dispatch, lzSettings: LayerZeroChains) => {
  const lockedTokensResp = await tryCatchJsonByAction(
    () => getLockedTokensAction(),
    false
  );

  if (lockedTokensResp instanceof ErrorResponse) {
    toast(`Error while fetching settings: ${lockedTokensResp.err}`);
    return;
  }

  const response = await getLayerZeroLockedTokens(lzSettings);

  const lockedTokens = {lockedTokens: lockedTokensResp, layerZeroLockedTokens: response}

  dispatch(setLockedTokensAction(lockedTokens));
};
