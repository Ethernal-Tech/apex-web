import { TokenDto } from '../swagger/apexBridgeApiService';

export type PKLoginDto = {
    address: string,
    privateKey: string,
}

const TOKEN = 'token';

export const setToken = (token: TokenDto) => {
	localStorage.setItem(TOKEN, JSON.stringify(token));
}

export const getToken = () : TokenDto | null => {
	const tokenString = localStorage.getItem(TOKEN);
	if (!tokenString) {
		return null;
	}

	return TokenDto.fromJS(JSON.parse(tokenString));
}

export const removeToken = () => {
	localStorage.removeItem(TOKEN);
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

// Source network handling
const SOURCE_NETWORK = 'source_network';
export const default_source_network = 'prime';

export const setSourceNetwork = (sourceNetwork: string) => {
	localStorage.setItem(SOURCE_NETWORK, sourceNetwork);
}

export const getSourceNetwork = () => {
	const source = localStorage.getItem(SOURCE_NETWORK);
	if(!source){
		return default_source_network;
	}
	
	return source;
}

export const resetSourceNetwork = (sourceNetwork: string) => {
	localStorage.setItem(SOURCE_NETWORK, sourceNetwork);
}


// Destination network handling
const DESTINATION_NETWORK = 'destination_network';
export const default_destination_network = 'vector';

export const setDestinationNetwork = (destinationNetwork: string) => {
	localStorage.setItem(DESTINATION_NETWORK, destinationNetwork);
}

export const getDestinationNetwork = () => {
	const destination = localStorage.getItem(DESTINATION_NETWORK);
	if(!destination){
		return default_destination_network;
	}
	
	return destination;
}

export const resetDestinationNetwork = (destinationNetwork: string) => {
	localStorage.setItem(DESTINATION_NETWORK, destinationNetwork);
}