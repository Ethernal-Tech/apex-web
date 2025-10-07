import { Dispatch } from "@reduxjs/toolkit";
import Web3 from "web3";
import { LayerZeroChains } from "../redux/slices/settingsSlice";
import { setLayerZeroLockedAction } from "../redux/slices/layerZeroSlice";
import { ChainEnum } from "../swagger/apexBridgeApiService";
import { CHAIN_URLS } from "../utils/chainUtils";

async function readErc20Meta(
  rpcUrl: string,
  tokenAddress: string
): Promise<bigint> {
  const web3 = new Web3(rpcUrl);

  let totalRaw: unknown = "0";

  try {
    totalRaw = await web3.eth.getBalance(tokenAddress);
  } catch {}

  const raw = BigInt(String(totalRaw ?? "0"));
  return raw;
}

export async function getTotalSupply(
  lzChain: LayerZeroChains
): Promise<bigint> {
  let out = BigInt(0);

  const lzSettings = lzChain[ChainEnum.Nexus]

  if (lzSettings) {
    try {
      out = await readErc20Meta(CHAIN_URLS[ChainEnum.Nexus], lzSettings.oftAddress);
    } catch (err) {
      console.error(`[getBalance] failed for nexus:`, err);
    }
  }

  return out;
}

export const fetchTotalSupplyAction = async (
  dispatch: Dispatch,
  settings: LayerZeroChains
) => {
  try {
    console.log("LZ SETTINGS IS", settings);

    const response = await getTotalSupply(settings);

    console.log("RESPONSE FROM", response);

    dispatch(setLayerZeroLockedAction(response));
  } catch {
    throw new Error(`Can't fetch LayerZero supply`);
  }
};
