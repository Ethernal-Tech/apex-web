import { NewAddress, RewardAddress } from "../features/Address/addreses";
import { BridgeTransactionDto, ChainEnum } from "../swagger/apexBridgeApiService";
import { areChainsEqual } from "./chainUtils";
import Web3 from "web3";
import {Numbers} from "web3-types";
import {EtherUnits} from "web3-utils";

// chain icons
import { ReactComponent as PrimeIcon } from '../assets/chain-icons/prime.svg';
import { ReactComponent as VectorIcon } from '../assets/chain-icons/vector.svg';
import { ReactComponent as NexusIcon } from '../assets/chain-icons/nexus.svg';
import { FunctionComponent, SVGProps } from "react";
import { isAddress } from "web3-validator";
import { ISettingsState } from "../redux/slices/settingsSlice";
import { UTxO } from "@meshsdk/core";

export const capitalizeWord = (word: string): string => {
    if (!word || word.length === 0) {
        return word;
    }

    return `${word[0].toUpperCase()}${word.substring(1)}`
}

export const getChainLabelAndColor = (chain: string):{letter:string, color: string} => {
  switch (chain.toLowerCase()) {
    case 'prime':
      return { letter: 'P', color: '#077368' };
    case 'nexus':
      return { letter: 'N', color: '#F27B50' };
    case 'vector':
      return { letter: 'V', color: '#F25041' };
    default:
      return { letter: '', color: 'transparent' };
  }
};

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
const convertUtxoDfmToApex = (dfm:string|number):string =>{
  return fromWei(dfm,'lovelace');
}

// converts apex to dfm (prime and vector)
const convertApexToUtxoDfm = (apex: string|number):string => {
  return toWei(apex,'lovelace');
}

// convert wei to dfm (nexus)
const convertEvmDfmToApex = (dfm:string|number):string =>{
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

export const validateSubmitTxInputs = (
  settings: ISettingsState, sourceChain: ChainEnum, destinationChain: ChainEnum,
  destinationAddr: string, amount: string, bridgeTxFee: string,
): string | undefined => {
  if ((sourceChain === ChainEnum.Prime || sourceChain === ChainEnum.Vector)) {
    if (BigInt(amount) < BigInt(settings.minValueToBridge)) {
      return `Amount less than minimum: ${convertUtxoDfmToApex(settings.minValueToBridge)} APEX`;
    }

    const maxAllowedToBridgeDfm = BigInt(settings.maxAmountAllowedToBridge)

    if (maxAllowedToBridgeDfm > 0 &&
        BigInt(amount) + BigInt(bridgeTxFee) > maxAllowedToBridgeDfm) {
      const maxAllowed = maxAllowedToBridgeDfm - BigInt(bridgeTxFee);
      return `Amount more than maximum allowed: ${convertUtxoDfmToApex(maxAllowed.toString(10))} APEX`;
    } 
  } else if(sourceChain === ChainEnum.Nexus){
    if (BigInt(amount) < BigInt(convertDfmToWei(settings.minValueToBridge))) {
      return `Amount less than minimum: ${convertUtxoDfmToApex(settings.minValueToBridge)} APEX`;
    }

    const maxAllowedToBridgeWei = BigInt(convertDfmToWei(settings.maxAmountAllowedToBridge));

    if (maxAllowedToBridgeWei > 0 &&
        BigInt(amount) + BigInt(bridgeTxFee) > maxAllowedToBridgeWei) {
      const maxAllowed = maxAllowedToBridgeWei - BigInt(bridgeTxFee);
      return `Amount more than maximum allowed: ${convertEvmDfmToApex(maxAllowed.toString(10))} APEX`;
    } 
  }

  if (destinationChain === ChainEnum.Prime || destinationChain === ChainEnum.Vector) {
    const addr = NewAddress(destinationAddr);
    if (!addr || addr instanceof RewardAddress || destinationAddr !== addr.String()) {
      return `Invalid destination address: ${destinationAddr}`;
    }
  
    if (!areChainsEqual(destinationChain, addr.GetNetwork())) {
      return `Destination address not compatible with destination chain: ${destinationChain}`;
    }
  } else if (destinationChain === ChainEnum.Nexus) {
    if (!isAddress(destinationAddr)) {
      return `Invalid destination address: ${destinationAddr}`;
    }
  }
}

export const chainIcons:{
  [ChainEnum.Prime]:FunctionComponent<SVGProps<SVGSVGElement>>
  [ChainEnum.Vector]:FunctionComponent<SVGProps<SVGSVGElement>>
  [ChainEnum.Nexus]:FunctionComponent<SVGProps<SVGSVGElement>>
} = {
  [ChainEnum.Prime]:PrimeIcon,
  [ChainEnum.Vector]:VectorIcon,
  [ChainEnum.Nexus]:NexusIcon
}

// format it differently depending on network (nexus is 18 decimals, prime and vector are 6)
export const convertDfmToApex = (dfm:string|number, network:ChainEnum) =>{
  // avoiding rounding errors
  if(typeof dfm === 'number') dfm = BigInt(dfm).toString()

  switch(network){
      case ChainEnum.Prime:
      case ChainEnum.Vector:
          return convertUtxoDfmToApex(dfm);
      case ChainEnum.Nexus:
          return convertEvmDfmToApex(dfm)
  }
}

export const convertApexToDfm = (apex:string|number, network:ChainEnum) =>{
  // avoiding errors
  if(typeof apex === 'number') apex = apex.toString()

  switch(network){
      case ChainEnum.Prime:
      case ChainEnum.Vector:
          return convertApexToUtxoDfm(apex);
      case ChainEnum.Nexus:
          return convertApexToEvmDfm(apex)
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

const DEFAULT_RETRY_DELAY_MS = 1000;

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

const POTENTIAL_COST_PER_TOKEN = 50000;

export const countUniqueTokens = (utxos: UTxO[] | undefined): number => {
  if (!utxos) {
    return 0;
  }

  const assetsMap = getAssetsSumMap(utxos);
  return Object.keys(assetsMap).filter(x => x !== 'lovelace').length;
};

export const calculatePotentialTokensCost = (utxos: UTxO[] | undefined): number => {
  return countUniqueTokens(utxos) * POTENTIAL_COST_PER_TOKEN;
};