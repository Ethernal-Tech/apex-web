import { Box, Typography } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { useEffect, useMemo } from 'react';
import { ChainEnum } from '../../swagger/apexBridgeApiService';
import './lockedTokens.css';
import { getCurrencyTokenInfo } from '../../settings/token';
import { toChainEnum } from '../../settings/chain';
import { fetchAndUpdateLockedTokensAction } from '../../actions/lockedTokens';
import { decodeTokenKey, isApexChain } from '../../utils/tokenUtils';
import { convertWeiToDfmBig } from '../../utils/generalUtils';
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
	const { layerZeroChains } = useSelector(
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
		const chunks: string[] = [];
		const tokenAmountsTVL: Record<string, bigint> = {};
		tokenAmountsTVL[TokenEnum.Ada] = BigInt(0);
		tokenAmountsTVL[TokenEnum.APEX] = BigInt(0);

		for (const [chainKey, tokenMap] of Object.entries(
			lockedTokens.chains,
		)) {
			const chainEnum = toChainEnum(chainKey);

			// ❌ Skip Cardano chains entirely
			if (chainEnum === ChainEnum.Cardano) continue;

			for (const [tokenKey, addrMap] of Object.entries(tokenMap)) {
				// Sum all addresses for this token
				let total = Object.values(addrMap).reduce<bigint>(
					(acc, v) =>
						acc + (typeof v === 'bigint' ? v : BigInt(v ?? 0)),
					BigInt(0),
				);

				// Optional: skip zero amounts
				if (total === BigInt(0)) continue;

				total += lockedTokensLZFormatted;

				if (
					decodeTokenKey(tokenKey) === TokenEnum.Ada ||
					decodeTokenKey(tokenKey) === TokenEnum.wADA
				) {
					tokenAmountsTVL[TokenEnum.Ada] += total;
				} else {
					tokenAmountsTVL[TokenEnum.APEX] += total;
				}
			}
		}

		for (const [token, value] of Object.entries(tokenAmountsTVL)) {
			const tokenTexts = `${formatBigIntDecimalString(value, 6)} ${decodeTokenKey(token).toUpperCase()}`;
			chunks.push(tokenTexts);
		}

		return chunks.join(' | ').trim();
	}, [lockedTokens.chains, lockedTokensLZFormatted]);

	const transferredData = useMemo(() => {
		let outValueApex = BigInt(0);
		let outValueAda = BigInt(0);

		const chunks: string[] = [];

		Object.entries(lockedTokens.totalTransferred).forEach(
			([chainKey, innerObj]) => {
				const chain = chainKey.toLowerCase();
				const o = innerObj as unknown as Record<
					string,
					string | number | bigint
				>;

				if (isApexChain(chain)) {
					outValueApex += BigInt(o.amount || '0');
					outValueAda += BigInt(
						Object.entries(o).find(
							(x) =>
								x[0] !== 'lovelace' &&
								x[0] !== 'amount' &&
								x[0] !== 'Ada',
						)?.[1] || '0',
					);
				} else if ((chain as ChainEnum) === ChainEnum.Cardano) {
					outValueAda += BigInt(o.amount || '0');
					outValueApex += BigInt(
						Object.entries(o).find((x) => x[0] !== 'amount')?.[1] ||
							'0',
					);
				}
			},
		);

		if (outValueAda > BigInt(0)) {
			const label = getCurrencyTokenInfo(ChainEnum.Cardano).label;
			chunks.push(
				`${formatBigIntDecimalString(outValueAda, 6)} ${label}`,
			);
		}

		if (outValueApex > BigInt(0)) {
			const label = getCurrencyTokenInfo(ChainEnum.Prime).label;
			chunks.push(
				`${formatBigIntDecimalString(outValueApex, 6)} ${label}`,
			);
		}

		return chunks.join(' | ').trim();
	}, [lockedTokens]);

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
