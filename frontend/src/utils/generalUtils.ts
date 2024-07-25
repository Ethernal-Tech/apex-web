import { NewAddress } from "../features/Address/addreses";
import appSettings from "../settings/appSettings";
import { ChainEnum } from "../swagger/apexBridgeApiService";
import { areChainsEqual } from "./chainUtils";

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


const DFM_APEX_CONVERSION_RATE = 10**6

// Convert the APEX amount to a string with appropriate formatting
export const convertDfmToApex = (dfm:number):string =>{
  const apex = dfm / DFM_APEX_CONVERSION_RATE; // divide by 1,000,000 (6 decimals)

  // Here we use toFixed to ensure six decimal places, adjust if needed
  return apex.toFixed(6); // Adjust decimal places as required
}

// converts a string representing an APEX amount (300.01) to a it's dfm number equivalent (300010000)
export const convertApexToDfm = (apex: string|number) => {
  const dfm = +apex * DFM_APEX_CONVERSION_RATE // multiply by 6 decimals
  return dfm;
}

export const validateSubmitTxInputs = (
  destinationChain: ChainEnum, destinationAddr: string, amount: number,
): string | undefined => {
  if (amount < appSettings.minUtxoValue) {
    return `Amount less than minimum: ${convertDfmToApex(appSettings.minUtxoValue)} APEX`;
  }

  const addr = NewAddress(destinationAddr);
  if (!addr || destinationAddr !== addr.String()) {
    return `Invalid destination address: ${destinationAddr}`;
  }

  if (!areChainsEqual(destinationChain, addr.GetNetwork())) {
    return `Destination address not compatible with destination chain: ${destinationChain}`;
  }
}
