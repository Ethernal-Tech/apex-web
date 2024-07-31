import { NewAddress } from "../features/Address/addreses";
import appSettings from "../settings/appSettings";
import { ChainEnum } from "../swagger/apexBridgeApiService";
import { areChainsEqual } from "./chainUtils";
import Web3 from "web3";

// chain icons
import { ReactComponent as PrimeIcon } from '../assets/chain-icons/prime.svg';
import { ReactComponent as VectorIcon } from '../assets/chain-icons/vector.svg';
import { ReactComponent as NexusIcon } from '../assets/chain-icons/nexus.svg';
import { FunctionComponent, SVGProps } from "react";

export const capitalizeWord = (word: string): string => {
    if (word.length === 0) {
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

export const formatAddress = (address:string|undefined):string => {
    if(!address) return '';
  
    // No need to format if the address is 13 chars long or shorter
    if (address.length <= 13) return address;
  
    const firstPart = address.substring(0, 7);
    const lastPart = address.substring(address.length - 5);
    return `${firstPart}...${lastPart}`;
  }


const DFM_APEX_UTXO_CONVERSION_RATE = 10**6

// converts dfm to apex (prime and vector)
const convertUtxoDfmToApex = (dfm:number):string =>{
  const apex = dfm / DFM_APEX_UTXO_CONVERSION_RATE; // divide by 1,000,000 (6 decimals)
  return apex.toFixed(6); // Adjust decimal places as required
}

// converts apex to dfm (prime and vector)
const convertApexToUtxoDfm = (apex: number) => {
  const dfm = +apex * DFM_APEX_UTXO_CONVERSION_RATE // multiply by 6 decimals
  return dfm;
}

// convert wei to dfm (nexus)
const convertEvmDfmToApex = (dfm:number):string =>{
  return Web3.utils.fromWei(dfm,'ether');
}

// convert eth to wei (nexus)
const convertApexToEvmDfm = (apex: number) => {
  return Web3.utils.toWei(apex,'wei');
}

export const validateSubmitTxInputs = (
  sourceChain: ChainEnum, destinationChain: ChainEnum, destinationAddr: string, amount: number,
): string | undefined => {
  if ((sourceChain === ChainEnum.Prime || sourceChain === ChainEnum.Vector) && amount < appSettings.minUtxoValue) {
    return `Amount less than minimum: ${convertUtxoDfmToApex(appSettings.minUtxoValue)} APEX`;
  } else if(sourceChain === ChainEnum.Nexus && amount < appSettings.minEvmValue){
    return `Amount less than minimum: ${convertEvmDfmToApex(appSettings.minUtxoValue)} APEX`;
  }

  const addr = NewAddress(destinationAddr);
  if (!addr || destinationAddr !== addr.String()) {
    return `Invalid destination address: ${destinationAddr}`;
  }

  if (!areChainsEqual(destinationChain, addr.GetNetwork())) {
    return `Destination address not compatible with destination chain: ${destinationChain}`;
  }
}

export const chainIcons:{
  prime:FunctionComponent<SVGProps<SVGSVGElement>>
  vector:FunctionComponent<SVGProps<SVGSVGElement>>
  nexus:FunctionComponent<SVGProps<SVGSVGElement>>
} = {
  prime:PrimeIcon,
  vector:VectorIcon,
  nexus:NexusIcon
}

// format it differently depending on network (nexus is 18 decimals, prime and vector are 6)
export const convertDfmToApex = (dfm:string|number, network:ChainEnum) =>{
  switch(network){
      case ChainEnum.Prime:
      case ChainEnum.Vector:
          return convertUtxoDfmToApex(+dfm);
      case ChainEnum.Nexus:
          return convertEvmDfmToApex(+dfm)
  }
}

export const convertApexToDfm = (dfm:string|number, network:ChainEnum) =>{
  switch(network){
      case ChainEnum.Prime:
      case ChainEnum.Vector:
          return convertApexToUtxoDfm(+dfm);
      case ChainEnum.Nexus:
          return convertApexToEvmDfm(+dfm)
  }
}