import { Box, Typography } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { useEffect, useMemo } from 'react';
import { ChainEnum } from '../../swagger/apexBridgeApiService';
import './lockedTokens.css';
import { getTokenInfo } from '../../settings/token';
import { toChainEnum } from '../../settings/chain';
import { fetchAndUpdateLockedTokensAction } from '../../actions/lockedTokens';
import {
	correlateTokenToACurrency,
	decodeTokenKey,
	isApexChain,
} from '../../utils/tokenUtils';
import { convertWeiToDfmBig } from '../../utils/generalUtils';
import { LovelaceTokenName } from '../../utils/chainUtils';
import { BridgingModeEnum } from '../../settings/chain';
import { TokenEnum } from '../../features/enums';

const powBigInt = (base: bigint, exp: number): bigint => {
	let result = BigInt(1);
	for (let i = 0; i < exp; i++) {
		result = result * base;
	}
	return result;
};

export const formatBigIntDecimalString = (value: bigint, decimals = 6) => {
	const divisor = powBigInt(BigInt(10), decimals);
	const whole = value / divisor;
	const fraction = value % divisor;

	// Format whole part (e.g., "1.000.000")
	const formattedWhole = whole
		.toString()
		.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

	// Pad fractional part to correct length (e.g., "01")
	const paddedFraction = fraction
		.toString()
		.padStart(decimals, '0')
		.slice(0, 2); // show only 2 decimals

	return `${formattedWhole}.${paddedFraction}`;
};

const LockedTokensComponent = () => {
	const lockedTokens = useSelector((state: RootState) => state.lockedTokens);
	const { layerZeroChains, settingsPerMode } = useSelector(
		(state: RootState) => state.settings,
	);
	const dispatch = useDispatch();

	useEffect(() => {
		// Call once immediately on mount
		fetchAndUpdateLockedTokensAction(dispatch, layerZeroChains);

		// Then call periodically every 30 seconds
		const interval = setInterval(() => {
			fetchAndUpdateLockedTokensAction(dispatch, layerZeroChains);
		}, 30_000); // 30,000 ms = 30 seconds

		// Cleanup on component unmount
		return () => clearInterval(interval);

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [layerZeroChains]);

	const lockedTokensLZFormatted = useMemo(() => {
		return convertWeiToDfmBig(lockedTokens.layerZeroLockedTokens);
	}, [lockedTokens.layerZeroLockedTokens]);

	const chainsData = useMemo(() => {
		const balances: { [key: string]: { [key: string]: bigint } } = {};

		for (const [chainKey, tokenMap] of Object.entries(
			lockedTokens.chains,
		)) {
			const chain = toChainEnum(chainKey);

			for (const [tokenKey, addrMap] of Object.entries(tokenMap)) {
				// Sum all addresses for this token
				const total = Object.values(addrMap).reduce<bigint>(
					(acc, v) =>
						acc + (typeof v === 'bigint' ? v : BigInt(v ?? 0)),
					BigInt(0),
				);

				if (!balances[chain]) {
					balances[chain] = {};
				}

				if (!balances[chain][tokenKey]) {
					balances[chain][tokenKey] = BigInt(0);
				}

				balances[chain][tokenKey] += total;
			}
		}

		const chunks: string[] = [];

		const getBalanceSafe = (chain: ChainEnum, tokenKey: string) => {
			if (!balances[chain]) return BigInt(0);

			return balances[chain][tokenKey] || BigInt(0);
		};

		const apexTotal =
			getBalanceSafe(ChainEnum.Prime, LovelaceTokenName) +
			getBalanceSafe(ChainEnum.Vector, LovelaceTokenName) +
			lockedTokensLZFormatted;
		if (apexTotal > BigInt(0)) {
			chunks.push(
				`${formatBigIntDecimalString(apexTotal, 6)} ${decodeTokenKey(LovelaceTokenName)}`,
			);
		}

		const adaTotal = getBalanceSafe(ChainEnum.Cardano, LovelaceTokenName);
		if (adaTotal > BigInt(0)) {
			chunks.push(
				`${formatBigIntDecimalString(adaTotal, 6)} ${decodeTokenKey(LovelaceTokenName, ChainEnum.Cardano)}`,
			);
		}

		return chunks.join(' | ').trim();
	}, [lockedTokens.chains, lockedTokensLZFormatted]);

	const skylineSettings = useMemo(
		() => settingsPerMode[BridgingModeEnum.Skyline],
		[settingsPerMode],
	);

	const transferredData = useMemo(() => {
		const tvb: { [key: string]: bigint } = {};

		const addToTvbSafe = (tokenLabel: string, value: bigint) => {
			if (!tvb[tokenLabel]) {
				tvb[tokenLabel] = BigInt(0);
			}

			tvb[tokenLabel] += value;
		};

		Object.entries(lockedTokens.totalTransferred).forEach(
			([chainKey, innerObj]) => {
				const chain = toChainEnum(chainKey);
				const perToken = innerObj as unknown as Record<
					string,
					string | number | bigint
				>;

				if (layerZeroChains[chain] && !isApexChain(chain)) {
					addToTvbSafe(
						getTokenInfo(TokenEnum.APEX).label,
						BigInt(
							Object.entries(perToken).find(
								(x) => x[0] !== 'amount',
							)?.[1] || '0',
						),
					);

					return;
				}

				Object.entries(perToken).forEach(([tokenKey, value]) => {
					const currencyInfo = correlateTokenToACurrency(
						skylineSettings.cardanoChainsNativeTokens,
						chain,
						tokenKey,
					);

					if (currencyInfo) {
						addToTvbSafe(currencyInfo.label, BigInt(value || '0'));
					}
				});
			},
		);

		const chunks: string[] = Object.entries(tvb)
			.map(([tokenLabel, value]) =>
				value > BigInt(0)
					? `${formatBigIntDecimalString(value, 6)} ${tokenLabel}`
					: '',
			)
			.filter((x) => !!x);

		return chunks.join(' | ').trim();
	}, [
		layerZeroChains,
		lockedTokens.totalTransferred,
		skylineSettings.cardanoChainsNativeTokens,
	]);

	return (
		<Box className="banner-container">
			{chainsData.length > 0 && (
				<Typography className="banner-text">
					TVL | {chainsData}
				</Typography>
			)}
			{transferredData.length > 0 && (
				<Typography className="banner-text">
					TVB | {transferredData}
				</Typography>
			)}
		</Box>
	);
};

export default LockedTokensComponent;
