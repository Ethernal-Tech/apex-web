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