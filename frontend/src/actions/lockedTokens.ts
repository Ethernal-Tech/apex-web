import { Dispatch } from '@reduxjs/toolkit';
import {
	BridgingModeEnum,
	ChainEnum,
	LockedTokensControllerClient,
} from '../swagger/apexBridgeApiService';
import { ErrorResponse, tryCatchJsonByAction } from '../utils/fetchUtils';
import { setLockedTokensAction } from '../redux/slices/lockedTokensSlice';
import { CHAIN_RPC_URLS } from '../utils/chainUtils';
import Web3 from 'web3';
import { LayerZeroChains } from '../settings/settingsRedux';

async function readErc20Meta(
	rpcUrl: string,
	tokenAddress: string,
): Promise<bigint> {
	const web3 = new Web3(rpcUrl);

	let totalRaw: unknown = '0';

	try {
		totalRaw = await web3.eth.getBalance(tokenAddress);

		console.log('Locked tokens LayerZero Token on Nexus: ', totalRaw);
	} catch (e) {
		console.log(`Failed to get eth balance for: ${tokenAddress}. e: ${e}`);
	}

	return BigInt(String(totalRaw ?? '0'));
}

async function getLayerZeroLockedTokens(
	lzChain: LayerZeroChains,
): Promise<bigint> {
	return lzChain[ChainEnum.Nexus]
		? readErc20Meta(
				CHAIN_RPC_URLS[ChainEnum.Nexus],
				lzChain[ChainEnum.Nexus].oftAddress,
			)
		: BigInt(0);
}

export const getLockedTokensAction = async () => {
	const client = new LockedTokensControllerClient();
	return client.get([
		BridgingModeEnum.Skyline,
		BridgingModeEnum.Layerzero,
		BridgingModeEnum.Reactor,
	]);
};

export const fetchAndUpdateLockedTokensAction = async (
	dispatch: Dispatch,
	lzSettings: LayerZeroChains,
) => {
	const lockedTokensResp = await tryCatchJsonByAction(
		() => getLockedTokensAction(),
		false,
	);

	if (lockedTokensResp instanceof ErrorResponse) {
		console.log(
			`Error while fetching locked tokens: ${lockedTokensResp.err}`,
		);
		return;
	}

	const response = await getLayerZeroLockedTokens(lzSettings);

	const lockedTokens = {
		lockedTokens: lockedTokensResp,
		layerZeroLockedTokens: response,
	};

	dispatch(setLockedTokensAction(lockedTokens));
};
