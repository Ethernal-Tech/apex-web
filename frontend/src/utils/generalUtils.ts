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

  export const dfmToApex = (dfm:number):string =>{
    // Divide the dfm amount by 1,000,000 to get the ADA amount
    const ada = dfm / 1000000;
  
    // Convert the ADA amount to a string with appropriate formatting
    // Here we use toFixed to ensure two decimal places, adjust if needed
    return ada.toFixed(6); // Adjust decimal places as required
  }