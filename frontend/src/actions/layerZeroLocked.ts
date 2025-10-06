import { Dispatch } from "@reduxjs/toolkit";
import Web3 from "web3";
import { ERC20_MIN_ABI } from "../features/ABI";
import { LayerZeroChains } from "../redux/slices/settingsSlice";
import { TotalSupply } from "../features/types";
import { setLayerZeroLockedAction } from "../redux/slices/layerZeroSlice";

function formatUnits(value: bigint, decimals = 18): string {
  const s = value.toString();
  if (decimals === 0) return s;
  const pad = s.padStart(decimals + 1, "0");
  const intPart = pad.slice(0, -decimals);
  const frac = pad.slice(-decimals).replace(/0+$/g, "");
  return frac ? `${intPart}.${frac}` : intPart;
}

async function readErc20Meta(
  rpcUrl: string,
  tokenAddress: string,
  chain: string
): Promise<TotalSupply> {
  const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
  const erc20 = new web3.eth.Contract(ERC20_MIN_ABI as any, tokenAddress);

  let decimalsRaw: unknown = "18";
  let symbolRaw: unknown = "";
  let totalRaw: unknown = "0";

  try {
    decimalsRaw = await erc20.methods.decimals().call();
  } catch {}
  try {
    symbolRaw = await erc20.methods.symbol().call();
  } catch {}
  try {
    totalRaw = await erc20.methods.totalSupply().call();
  } catch {}

  const decimals = Number(decimalsRaw as any) || 18;

  // normalize symbol (handles bytes32/0x-encoded)
  let symbol =
    typeof symbolRaw === "string" ? symbolRaw : String(symbolRaw ?? "");
  if (/^0x[0-9a-fA-F]{64}$/.test(symbol)) {
    try {
      symbol = Web3.utils.hexToUtf8(symbol).replace(/\0+$/, "");
    } catch {}
  }
  if (!symbol) symbol = "TOKEN";

  const raw = BigInt(String(totalRaw ?? "0"));
  return { decimals, symbol, raw, formatted: formatUnits(raw, decimals), chain: chain };
}

export async function getTotalSupply(
  lzChain: LayerZeroChains
): Promise<TotalSupply[]> {
  const out: TotalSupply[] = [];

  for (const [alias, { rpcUrl, oftAddress }] of Object.entries(lzChain)) {
    try {
      const meta = await readErc20Meta(rpcUrl, oftAddress, alias);
      out.push(meta); // add to array while iterating
    } catch (err) {
      console.error(`[getTotalSupply] failed for ${alias}:`, err);
    }
  }

  return out;
}

export const fetchTotalSupplyAction = async (
  dispatch: Dispatch,
  settings: LayerZeroChains
) => {
  try {
    const response = await getTotalSupply(settings);

    console.log("RESPONSE FROM", response);

    dispatch(setLayerZeroLockedAction(response));
  } catch {
    throw new Error(`Can't fetch LayerZero supply`);
  }
};
