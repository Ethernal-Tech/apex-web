import { Box, Typography } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { useEffect, useMemo } from 'react';
import { ChainEnum, TokenEnum } from '../../swagger/apexBridgeApiService';
import './lockedTokens.css';
import { isAdaToken, isApexToken, getTokenInfo } from '../../settings/token';
import { toChainEnum } from '../../settings/chain';
import { fetchAndUpdateLockedTokensAction } from '../../actions/lockedTokens';
import { convertWeiToDfmBig } from '../../utils/generalUtils';

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
			getBalanceSafe(ChainEnum.Prime, TokenEnum.APEX) +
			getBalanceSafe(ChainEnum.Vector, TokenEnum.APEX) +
			lockedTokensLZFormatted;
		if (apexTotal > BigInt(0)) {
			chunks.push(
				`${formatBigIntDecimalString(apexTotal, 6)} ${getTokenInfo(TokenEnum.APEX).label}`,
			);
		}

		const adaTotal = getBalanceSafe(ChainEnum.Cardano, TokenEnum.ADA);
		if (adaTotal > BigInt(0)) {
			chunks.push(
				`${formatBigIntDecimalString(adaTotal, 6)} ${getTokenInfo(TokenEnum.ADA).label}`,
			);
		}

		return chunks.join(' | ').trim();
	}, [lockedTokens.chains, lockedTokensLZFormatted]);

	const transferredData = useMemo(() => {
		const grandTotals = Object.values(lockedTokens.totalTransferred).reduce(
			(accumulator, perTokenMap) => {
				for (const [tokenKey, value] of Object.entries(perTokenMap)) {
					const amount = BigInt(value || '0');

					if (isApexToken(tokenKey as TokenEnum)) {
						accumulator[TokenEnum.APEX] += amount;
					} else if (isAdaToken(tokenKey as TokenEnum)) {
						accumulator[TokenEnum.ADA] += amount;
					}
				}
				return accumulator;
			},
			{
				[TokenEnum.APEX]: BigInt(0),
				[TokenEnum.ADA]: BigInt(0),
			},
		);

		const chunks = Object.entries(grandTotals)
			.map(([tokenKey, totalValue]) => {
				if (totalValue > BigInt(0)) {
					const label = getTokenInfo(tokenKey as TokenEnum).label;
					const formattedAmount = formatBigIntDecimalString(
						totalValue,
						6,
					);
					return `${formattedAmount} ${label}`;
				}
				return null; // Return null for zero-value entries
			})
			.filter((chunk): chunk is string => !!chunk); // Filter out the null entries

		return chunks.join(' | ');
	}, [lockedTokens.totalTransferred]);

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
