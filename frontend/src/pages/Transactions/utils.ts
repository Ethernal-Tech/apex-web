import {
	BridgingSettingsTokenPairDto,
	ChainEnum,
} from '../../swagger/apexBridgeApiService';
import { useMemo } from 'react';
import { getTokenInfo, TokenInfo } from '../../settings/token';
import { ISettingsState } from '../../settings/settingsRedux';

export interface TokenOption {
	value: string;
	label: string;
	icon: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
	borderColor: string;
}

const tokenInfoToTokenOption = (info: TokenInfo): TokenOption => {
	return {
		value: info.tokenID.toString(),
		label: info.label,
		icon: info.icon,
		borderColor: info.borderColor,
	};
};

export const useSupportedSourceTokenOptions = (
	settings: ISettingsState,
	srcChain: ChainEnum,
	dstChain: ChainEnum,
): TokenOption[] => {
	return useMemo(() => {
		const tokenPairs =
			(settings.directionConfig[srcChain] || { destChain: {} }).destChain[
				dstChain
			] || [];

		return tokenPairs.map((x: BridgingSettingsTokenPairDto) =>
			tokenInfoToTokenOption(getTokenInfo(x.srcTokenID)),
		);
	}, [settings.directionConfig, srcChain, dstChain]);
};
