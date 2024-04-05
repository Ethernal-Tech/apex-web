import { TokenDto } from '../swagger/apexBridgeApiService';

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
