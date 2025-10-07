import { TokenEnum } from "../features/enums";
import { getTokenInfo } from "../settings/token";
import { ChainEnum } from "../swagger/apexBridgeApiService";

const decodeHex = (hex: string) => {
	try {
		return decodeURIComponent(hex.replace(/(..)/g, '%$1'));
	} catch (e) {
		return '[InvalidHex]';
	}
};

export function decodeTokenKey(tokenKey: string, chain?: string): string {
	if (chain === ChainEnum.Cardano) {
		return getTokenInfo(TokenEnum.WAPEX).label;
	}

	if (tokenKey === 'lovelace' || tokenKey === 'amount') return getTokenInfo(TokenEnum.APEX).label; 
	const parts = tokenKey.split('.');
	if (parts.length < 2) return tokenKey;
	const hex = parts[1];
	let decoded = '';
	try {
		decoded = decodeHex(hex) as string;
	} catch {
		/* ignore */
	}
	if (!decoded || /invalid\s*hex/i.test(decoded)) return hex;
	return decoded;
}
