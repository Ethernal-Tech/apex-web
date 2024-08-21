import { NewAddress } from "../features/Address/addreses";
import appSettings from "../settings/appSettings";
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

export const validateSubmitTxInputs = (
  sourceChain: ChainEnum, destinationChain: ChainEnum, destinationAddr: string, amount: string,
): string | undefined => {
  if ((sourceChain === ChainEnum.Prime || sourceChain === ChainEnum.Vector) && BigInt(amount) < BigInt(appSettings.minUtxoValue)) {
    return `Amount less than minimum: ${convertUtxoDfmToApex(appSettings.minUtxoValue)} APEX`;
  } else if(sourceChain === ChainEnum.Nexus && BigInt(amount) < BigInt(appSettings.minEvmValue)){
    return `Amount less than minimum: ${convertEvmDfmToApex(appSettings.minEvmValue)} APEX`;
  }

  if (destinationChain === ChainEnum.Prime || destinationChain === ChainEnum.Vector) {
    const addr = NewAddress(destinationAddr);
    if (!addr || destinationAddr !== addr.String()) {
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
        return Buffer.from(hex, 'hex');

    return Buffer.from(hex, 'utf-8');
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