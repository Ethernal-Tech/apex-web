import { BridgeTransactionDto, ChainEnum } from "../swagger/apexBridgeApiService";
import Web3 from "web3";
import {Numbers} from "web3-types";
import {EtherUnits} from "web3-utils";

// chain icons
import { UTxO } from "../features/WalletHandler";
import {
  BigNum,
  Value,
  MultiAsset,
  Assets,
  AssetName,
  ScriptHash,
  TransactionOutput,
  Address,
} from '@emurgo/cardano-serialization-lib-browser';
import { isCardanoChain, isEvmChain, isLZBridging } from "../settings/chain";
import appSettings from "../settings/appSettings";

export const capitalizeWord = (word: string): string => {
    if (!word || word.length === 0) {
        return word;
    }

    return `${word[0].toUpperCase()}${word.substring(1)}`
}

export const formatAddress = (
    address:string|undefined, 
    firstLettersToShow = 7, 
    lastLettersToShow = 5
  ):string => {
  if(!address) return '';

  // No need to format if the address is 13 chars long or shorter
  if (address.length <= 13) return address;

  const firstPart = address.substring(0, firstLettersToShow);
  const lastPart = address.substring(address.length - lastLettersToShow);
  return `${firstPart}...${lastPart}`;
}

const fromWei = (number: Numbers, unit: EtherUnits | number): string => {
    const val = Web3.utils.fromWei(number, unit);
    return val.endsWith('.') ? val.slice(0, -1) : val;
}

const toWei = (number: Numbers, unit: EtherUnits | number): string => {
  const val = Web3.utils.toWei(number, unit);
  return val.endsWith('.') ? val.slice(0, -1) : val;
}

// converts dfm to apex (prime and vector)
export const convertUtxoDfmToApex = (dfm:string|number):string =>{
  return fromWei(dfm,'lovelace');
}

// converts apex to dfm (prime and vector)
const convertApexToUtxoDfm = (apex: string|number):string => {
  return toWei(apex,'lovelace');
}

// convert wei to dfm (nexus)
export const convertEvmDfmToApex = (dfm:string|number):string =>{
  return fromWei(dfm,'ether');
}

// convert eth to wei (nexus)
const convertApexToEvmDfm = (apex: string|number):string => {
  return toWei(apex,'ether');
}

export const convertWeiToDfm = (wei: string | number): string => {
	return fromWei(wei, 12);
};

export const convertDfmToWei = (dfm: string | number): string => {
	return toWei(dfm, 12);
};

const LPS = BigInt(1_000_000_000);

export const lamportsToSolExact = (lamports: bigint, decimals = 9): string => {
  const whole = lamports / LPS;
  const frac = (lamports % LPS).toString().padStart(9, "0");
  let trimmedFrac = frac.slice(0, decimals);
  if (trimmedFrac.match(/[1-9]/)) {
    trimmedFrac = trimmedFrac.replace(/0+$/, "");
  } else {
    trimmedFrac = "";
  }
  
  return trimmedFrac ? `${whole}.${trimmedFrac}` : whole.toString();
};

export const solToLamportsExact = (sol: string): bigint => {
  const [w = "0", f = ""] = sol.split(".");
  const frac = (f + "0".repeat(9)).slice(0, 9); // pad/truncate to 9
  return BigInt(w) * LPS + BigInt(frac);
};

export const shouldUseMainnet = (src: ChainEnum, dst: ChainEnum): boolean =>
  appSettings.isMainnet || isLZBridging(src, dst);

// format it differently depending on network (nexus is 18 decimals, prime and vector are 6)
export const convertDfmToApex = (dfm:string|number, network:ChainEnum) =>{
  // avoiding rounding errors
  if(typeof dfm === 'number') dfm = BigInt(dfm).toString()

  if (isEvmChain(network)) {
    return convertEvmDfmToApex(dfm);
  } else if (isCardanoChain(network)) {
    return convertUtxoDfmToApex(dfm);
  } else {
    return dfm; // should we throw exception here?
  }
}

export const convertApexToDfm = (apex:string|number, network:ChainEnum) =>{
  // avoiding errors
  if(typeof apex === 'number') apex = apex.toString()

  if (isEvmChain(network)) {
    return convertApexToEvmDfm(apex);
  } else if (isCardanoChain(network)) {
    return convertApexToUtxoDfm(apex);
  } else {
    return apex; // should we throw exception here?
  }
}

export const toBytes = (hex: string): Uint8Array => {
    if (hex.length % 2 === 0 && /^[0-9A-F]*$/i.test(hex))
        return Buffer.from(hex, 'hex') as unknown as Uint8Array;

    return Buffer.from(hex, 'utf-8') as unknown as Uint8Array;
};

// used to parse date returned from fallback database
export const parseDateString = (dateString:string):Date => {
  // Split the date string into components
  const parts = dateString.split(' ');
  const month = parts[1];
  const day = parts[2];
  const year = parts[3];
  const time = parts[4];

  // Create a new date string in a format that Date() can parse
  const formattedDateString = `${month} ${day}, ${year} ${time} GMT+00:00`;
  
  return new Date(formattedDateString);
}


export const formatTxDetailUrl = (transaction:BridgeTransactionDto): string =>{
  return `/transaction/${transaction.id}`
}

export const toFixed = (n: number | string, decimals: number) => {
  return (+n).toFixed(decimals);
}

export const toFixedFloor = (n: number | string, decimals: number) => {
  const exp = Math.pow(10, decimals)
  return (Math.floor(+n * exp) / exp).toFixed(decimals);
}

export const minBigInt = (...args: bigint[]): bigint => {
  return args.reduce((min, val) => val < min ? val : min);
}

const DEFAULT_RETRY_DELAY_MS = 1000;

export const shortRetryOptions = {
    retryCnt: 10,
    waitTime: 1000,
}

export const longRetryOptions = {
    retryCnt: 20,
    waitTime: 5000,
}

export const wait = async (durationMs: number) =>
	new Promise((res) => setTimeout(res, durationMs));

export const retryForever = async <T>(
	callback: () => Promise<T> | T,
	retryDelayMs: number = DEFAULT_RETRY_DELAY_MS,
): Promise<T> => {
	while (true) {
		try {
			return await callback();
		} catch (e) {
			console.log('Error while retryForever', e);

			await wait(retryDelayMs);
		}
	}
};

export const retry = async <T>(
	callback: () => Promise<T> | T,
	tryCount: number,
	retryDelayMs: number = DEFAULT_RETRY_DELAY_MS,
): Promise<T> => {
	for (let i = 0; i < tryCount; ++i) {
		try {
			return await callback();
		} catch (e) {
			console.log('Error while retry', e);

			await wait(retryDelayMs);
		}
	}

	throw new Error(`failed to execute callback. tryCount: ${tryCount}`);
};

export const getAssetsSumMap = (utxos: UTxO[]) => {
  const assetsSumMap: { [unit: string]: bigint } = {};
  for (let j = 0; j < utxos.length; ++j) {
      const assets = utxos[j].output.amount;
      
      for (let i = 0; i < assets.length; ++i) {
          const asset = assets[i];

          if (!assetsSumMap[asset.unit]) {
              assetsSumMap[asset.unit] = BigInt(0);
          }

          assetsSumMap[asset.unit] += BigInt(asset?.quantity || "0");
      }
  }

  return assetsSumMap;
};

const COINS_PER_UTXO_BYTE = 4310;
const TX_OUT_SIZE_ADDITIONAL = 160;

const calculateMinUtxo = (utxos: UTxO[]) => {
  if (utxos.length === 0) {
    throw new Error('UTxO array is empty');
  }

  const value = Value.new(BigNum.from_str('0'));
  const multiAsset = MultiAsset.new();

  for (const utxo of utxos) {
    for (const asset of utxo.output.amount) {
      if (asset.unit === 'lovelace') {
        const existing = value.coin();
        value.set_coin(existing.checked_add(BigNum.from_str(asset.quantity)));

        continue;
      }

      const policyId = asset.unit.slice(0, 56);
      const assetNameHex = asset.unit.slice(56);
      const quantity = BigNum.from_str(asset.quantity);

      const policyScriptHash = ScriptHash.from_bytes(Buffer.from(policyId, "hex") as unknown as Uint8Array);
      const assetName = AssetName.new(Buffer.from(assetNameHex, "hex") as unknown as Uint8Array);

      let assets = multiAsset.get(policyScriptHash) || Assets.new();
      const current = assets.get(assetName) || BigNum.from_str("0");

      assets.insert(assetName, current.checked_add(quantity));
      multiAsset.insert(policyScriptHash, assets);
    }
  }

  if (multiAsset.len() > 0) {
    value.set_multiasset(multiAsset);
  }

  const address = Address.from_bech32(utxos[0].output.address);
  const txOutSize = TransactionOutput.new(address, value).to_bytes().length;

  return COINS_PER_UTXO_BYTE * (txOutSize + TX_OUT_SIZE_ADDITIONAL);
}

export const calculateChangeMinUtxo = (utxos: UTxO[] | undefined, defaultMinUtxo: number): number => {
  if (!utxos) {
    return defaultMinUtxo;
  }

  try {
    return Math.max(calculateMinUtxo(utxos), defaultMinUtxo);
  } catch (e) {
    console.log('error while calculating change minUtxo', e);
  }

  // if the calculation failed and we have native tokens, take changeMinUtxo to be 2*defaultMinUtxo
  return Object.keys(getAssetsSumMap(utxos)).length > 1 ? 2 * defaultMinUtxo : defaultMinUtxo;
};