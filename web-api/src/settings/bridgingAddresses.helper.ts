import axios from 'axios';

/**
 * Bridging addresses for a chain, via cardano-api's
 * `GET /api/CardanoTx/GetBridgingAddresses?chainId=...`, which fronts the
 * oracle's `/api/BridgingAddress/GetAllAddresses`.
 *
 * For a Cardano chain the answer is every payment address; for an EVM chain it
 * is a single entry, the gateway contract. Note the endpoint is registered by
 * cardano-api's skyline controller only - the reactor controller serves
 * `GetSettings` and the two tx routes and nothing else - so a reactor URL will
 * 404 here.
 *
 * Not usable for Solana: there the oracle serves the program ID, which holds no
 * tokens, so balances have to come from SOLANA_HOLDER_ADDRS instead - see
 * MultiChainTvlService.solanaHolders.
 *
 * The `GET /settings/getBridgingAddresses` proxy stays as it is: it is a public
 * endpoint whose contract is to turn an upstream failure into a 400.
 */

const BRIDGING_ADDRESSES_PATH = '/api/CardanoTx/GetBridgingAddresses';

/** The oracle answers `{"addresses": null}` for a chain it has no addresses for. */
type AllBridgingAddressesResponse = {
	addresses: string[] | null;
};

/** Throws on an unreachable cardano-api or a chain with no addresses. */
export async function getBridgingAddresses(
	cardanoApiUrl: string,
	apiKey: string | undefined,
	chainId: string,
): Promise<string[]> {
	const endpointUrl = `${cardanoApiUrl}${BRIDGING_ADDRESSES_PATH}?chainId=${encodeURIComponent(chainId)}`;

	const { data } = await axios.get<AllBridgingAddressesResponse>(endpointUrl, {
		headers: {
			'X-API-KEY': apiKey,
			'Content-Type': 'application/json',
		},
		timeout: 10_000,
	});

	const addresses = (data?.addresses ?? []).filter(Boolean);
	if (addresses.length === 0) {
		throw new Error(`no bridging addresses for ${chainId}`);
	}

	return addresses;
}
