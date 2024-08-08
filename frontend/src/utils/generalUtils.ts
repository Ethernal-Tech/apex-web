import { NewAddress } from "../features/Address/addreses";
import appSettings from "../settings/appSettings";
import { BridgeTransactionDto, ChainEnum } from "../swagger/apexBridgeApiService";
import { areChainsEqual } from "./chainUtils";
import Web3 from "web3";

// chain icons
import { ReactComponent as PrimeIcon } from '../assets/chain-icons/prime.svg';
import { ReactComponent as VectorIcon } from '../assets/chain-icons/vector.svg';
import { ReactComponent as NexusIcon } from '../assets/chain-icons/nexus.svg';
import { FunctionComponent, SVGProps } from "react";

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

export const formatAddress = (address:string|undefined):string => {
  if(!address) return '';

  // No need to format if the address is 13 chars long or shorter
  if (address.length <= 13) return address;

  const firstPart = address.substring(0, 7);
  const lastPart = address.substring(address.length - 5);
  return `${firstPart}...${lastPart}`;
}

// converts dfm to apex (prime and vector)
const convertUtxoDfmToApex = (dfm:string|number):string =>{
  return Web3.utils.fromWei(dfm,'lovelace');
}

// converts apex to dfm (prime and vector)
const convertApexToUtxoDfm = (apex: string|number):string => {
  return Web3.utils.toWei(apex,'lovelace');
}

// convert wei to dfm (nexus)
const convertEvmDfmToApex = (dfm:string|number):string =>{
  return Web3.utils.fromWei(dfm,'ether');
}

// convert eth to wei (nexus)
const convertApexToEvmDfm = (apex: string|number):string => {
  return Web3.utils.toWei(apex,'ether');
}

export const validateSubmitTxInputs = (
  sourceChain: ChainEnum, destinationChain: ChainEnum, destinationAddr: string, amount: number,
): string | undefined => {
  if ((sourceChain === ChainEnum.Prime || sourceChain === ChainEnum.Vector) && amount < appSettings.minUtxoValue) {
    return `Amount less than minimum: ${convertUtxoDfmToApex(appSettings.minUtxoValue)} APEX`;
  } else if(sourceChain === ChainEnum.Nexus && amount < appSettings.minEvmValue){
    return `Amount less than minimum: ${convertEvmDfmToApex(appSettings.minUtxoValue)} APEX`;
  }

  if (destinationChain === ChainEnum.Prime || destinationChain === ChainEnum.Vector) {
    const addr = NewAddress(destinationAddr);
    if (!addr || destinationAddr !== addr.String()) {
      return `Invalid destination address: ${destinationAddr}`;
    }
  
    if (!areChainsEqual(destinationChain, addr.GetNetwork())) {
      return `Destination address not compatible with destination chain: ${destinationChain}`;
    }
  } else {
    // TODO: validate destination evm address
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
  const idParam = 
  (
    (transaction.originChain === ChainEnum.Prime && transaction.destinationChain === ChainEnum.Nexus)
    || (transaction.originChain === ChainEnum.Nexus && transaction.destinationChain === ChainEnum.Prime)
  ) 
  ? transaction.sourceTxHash 
  : transaction.id;

  return `/transaction/${idParam}?originChain=${transaction.originChain}&destinationChain=${transaction.destinationChain}`
}

/* Used to sort transactions in frontend based on order and orderBy filter parameters */
export const sortTransactions = (transactions: BridgeTransactionDto[], order: 'asc'|'desc', orderBy:string)=>{
  switch(orderBy){
    case 'amount':
      return transactions.sort((a,b)=> order === 'asc' ? a.amount - b.amount : b.amount - a.amount);

    case 'createdAt':
      return transactions.sort((a,b)=> {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : -Infinity;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : -Infinity;
        return order === 'asc' ? dateA - dateB : dateB - dateA;
      })

    case 'finishedAt':
      return transactions.sort((a,b)=>{
        const dateA = a.finishedAt ? new Date(a.finishedAt).getTime() : -Infinity;
        const dateB = b.finishedAt ? new Date(b.finishedAt).getTime() : -Infinity;
      
        return order === 'asc' ? dateA - dateB : dateB - dateA;
      })

    case 'status':
    case 'originChain':
    case 'destinationChain':
    case 'receiverAddresses':
      return transactions.sort((a,b)=>{
        const itemA = a[orderBy];
        const itemB = b[orderBy];

      
        return order === 'asc' ? itemA.localeCompare(itemB) : itemB.localeCompare(itemA);
      })

    default:
      return transactions
  }
}