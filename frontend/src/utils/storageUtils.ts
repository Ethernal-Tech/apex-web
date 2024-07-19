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