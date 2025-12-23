import { Box, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { useMemo } from 'react';
import { ChainEnum } from '../../swagger/apexBridgeApiService';
import './lockedTokens.css';
import {
	getTokenInfo,
	apexID,
	adaID,
	getCurrencyID,
} from '../../settings/token';
import { toChainEnum } from '../../settings/chain';
import { convertWeiToDfmBig } from '../../utils/generalUtils';
import { isAdaToken, isApexToken } from '../Audit/token';

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
	const settings = useSelector((state: RootState) => state.settings);

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

		const getBalanceSafe = (chain: ChainEnum, tokenKey: number) => {
			if (!balances[chain]) return BigInt(0);

			return balances[chain][tokenKey] || BigInt(0);
		};

		const apexTotal =
			getBalanceSafe(ChainEnum.Prime, apexID) +
			getBalanceSafe(ChainEnum.Vector, apexID) +
			lockedTokensLZFormatted;
		if (apexTotal > BigInt(0)) {
			chunks.push(
				`${formatBigIntDecimalString(apexTotal, 6)} ${getTokenInfo(apexID).label}`,
			);
		}

		const cardanoCurrency =
			getCurrencyID(settings, ChainEnum.Cardano) || adaID;

		// temporarily disable display of ada
		delete balances[ChainEnum.Cardano];

		const adaTotal = getBalanceSafe(ChainEnum.Cardano, cardanoCurrency);
		if (adaTotal > BigInt(0)) {
			chunks.push(
				`${formatBigIntDecimalString(adaTotal, 6)} ${getTokenInfo(cardanoCurrency).label}`,
			);
		}

		return chunks.join(' | ').trim();
	}, [lockedTokens.chains, lockedTokensLZFormatted, settings]);

	const transferredData = useMemo(() => {
		const grandTotals = Object.values(lockedTokens.totalTransferred).reduce(
			(accumulator, perTokenMap) => {
				for (const [tokenKey, value] of Object.entries(perTokenMap)) {
					const amount = BigInt(value || '0');

					if (isApexToken(+tokenKey)) {
						accumulator[apexID] += amount;
					} else if (isAdaToken(+tokenKey)) {
						accumulator[adaID] += amount;
					}
				}
				return accumulator;
			},
			{
				[apexID]: BigInt(0),
				[adaID]: BigInt(0),
			},
		);

		// temporarily disable display of ada
		delete grandTotals[adaID];

		const chunks = Object.entries(grandTotals)
			.map(([tokenKey, totalValue]) => {
				if (totalValue > BigInt(0)) {
					const label = getTokenInfo(+tokenKey).label;
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
