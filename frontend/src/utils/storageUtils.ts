import appSettings from "../settings/appSettings";
import { ChainEnum } from "../swagger/apexBridgeApiService";

export type PKLoginDto = {
    address: string,
    privateKey: string,
}

const PK_LOGIN = 'pk_login';

export const setPKLogin = (pkLogin: PKLoginDto) => {
	localStorage.setItem(PK_LOGIN, JSON.stringify(pkLogin));
}

export const getPKLogin = () : PKLoginDto | null => {
	const pkLoginString = localStorage.getItem(PK_LOGIN);
	if (!pkLoginString) {
		return null;
	}

	const obj = JSON.parse(pkLoginString)
	return { address: obj.address, privateKey: obj.privateKey };
}

export const removePKLogin = () => {
	localStorage.removeItem(PK_LOGIN);
}

const SELECTED_WALLET = 'selected_wallet';

export const setSelectedWallet = (wallet: string) => {
	localStorage.setItem(SELECTED_WALLET, wallet);
}

export const getSelectedWallet = () : string | null => {
	return localStorage.getItem(SELECTED_WALLET);
}

export const removeSelectedWallet = () => {
	localStorage.removeItem(SELECTED_WALLET);
}

const SELECTED_CHAIN = 'selected_chain';

export const setSelectedChain = (chain: ChainEnum) => {
	localStorage.setItem(SELECTED_CHAIN, chain);
}

export const getSelectedChain = () : ChainEnum | null => {
	const item = localStorage.getItem(SELECTED_CHAIN);
	if (item === null) {
		return item;
	}
	
	return item as ChainEnum;
}

export const removeSelectedChain = () => {
	localStorage.removeItem(SELECTED_CHAIN);
}

const DESTINATION_CHAIN = 'destination_chain';

export const setDestinationChain = (chain: ChainEnum) => {
	localStorage.setItem(DESTINATION_CHAIN, chain);
}

export const getDestinationChain = () : ChainEnum | null => {
	const item = localStorage.getItem(DESTINATION_CHAIN);
	if (item === null) {
		return item;
	}
	
	return item as ChainEnum;
}

export const removeDestinationChain = () => {
	localStorage.removeItem(DESTINATION_CHAIN);
}

export const initChainsState = () => {
	const chain = getSelectedChain();
	const destinationChain = getDestinationChain();
	
	// reset chains if anything is wrong or missing from localStorage values
	if (!chain || !destinationChain || chain === destinationChain) {
		setSelectedChain(ChainEnum.Prime);
		setDestinationChain(appSettings.isSkyline ? ChainEnum.Cardano : ChainEnum.Vector);
		return {
			chain: ChainEnum.Prime,
			destinationChain: appSettings.isSkyline ? ChainEnum.Cardano : ChainEnum.Vector,
		};
	}

	return {
		chain,
		destinationChain,
	};
}