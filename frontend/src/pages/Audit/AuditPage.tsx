import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { Box, Tabs, Tab } from '@mui/material';

import BasePage from '../base/BasePage';
import {
	BridgingModeEnum,
	ChainEnum,
} from '../../swagger/apexBridgeApiService';
import SkylinePanel from '../../components/Audit/SkylineAudit';
import LayerZeroPanel from '../../components/Audit/LayerZeroAudit';
import '../../audit.css';
import {
	correlateTokenToACurrency,
	decodeTokenKey,
	isApexChain,
} from '../../utils/tokenUtils';
import { LovelaceTokenName } from '../../utils/chainUtils';
import { getTokenInfo } from '../../settings/token';
import { TokenEnum } from '../../features/enums';
import { toChainEnum } from '../../settings/chain';

const sumToken = (m: Record<string, bigint>) =>
	Object.values(m).reduce((a, b) => a + b, BigInt(0));

const sumChain = (
	tokenMap: Record<string, Record<string, bigint>> | Record<string, bigint>,
	filter?: (tokenKey: string) => boolean,
): Record<string, bigint> => {
	return Object.fromEntries(
		Object.entries(tokenMap)
			.filter(([k]) => !filter || filter(k))
			.map(([k, v]) => [
				k,
				typeof v === 'bigint'
					? v
					: sumToken(v as Record<string, bigint>),
			]),
	);
};

const addAll = (
	into: Record<string, bigint>,
	totals: Record<string, bigint>,
	mapKey?: (k: string) => string,
) => {
	for (const [t, v] of Object.entries(totals)) {
		const key = mapKey ? mapKey(t) : t;
		into[key] = (into[key] ?? BigInt(0)) + v;
	}
	return into;
};

const layerZeroChains = [ChainEnum.Nexus, ChainEnum.Base, ChainEnum.Bsc];

const AuditPage: React.FC = () => {
	const { chains, totalTransferred: tvbChains } = useSelector(
		(s: RootState) => s.lockedTokens,
	);
	const settings = useSelector((s: RootState) => s.settings);

	const chainKeys = useMemo(() => Object.keys(chains), [chains]);

	const perChainTotals = useMemo(
		() =>
			Object.fromEntries(
				Object.entries(chains).map(([chain, tokenMap]) => [
					chain,
					sumChain(tokenMap),
				]),
			),
		[chains],
	);

	const skylineChains = useMemo<ChainEnum[]>(() => {
		if (!settings) return [];
		return Object.keys(
			settings.settingsPerMode[BridgingModeEnum.Skyline]
				.allowedDirections,
		) as unknown as ChainEnum[];
	}, [settings]);

	const tokenTotalsAllChains = useMemo(() => {
		const acc: Record<string, bigint> = {};
		for (const [chain, totals] of Object.entries(perChainTotals)) {
			addAll(
				acc,
				{ [LovelaceTokenName]: totals[LovelaceTokenName] || BigInt(0) },
				(tk: string) => decodeTokenKey(tk, chain),
			);
		}
		return acc;
	}, [perChainTotals]);

	const skylineSettings = useMemo(
		() => settings.settingsPerMode[BridgingModeEnum.Skyline],
		[settings.settingsPerMode],
	);

	// Now use those values inside your other memos
	const { tvbPerChainTotals, tvbTokenTotalsAllChains, tvbGrandTotal } =
		useMemo(() => {
			const skylineSet = new Set(skylineChains); // ⬅️ use memoized value
			const tvbPerChainTotals = Object.fromEntries(
				Object.entries(tvbChains)
					.filter(([chain]) => skylineSet.has(chain as ChainEnum))
					.map(([chain, tokenMap]) => [chain, sumChain(tokenMap)]),
			);

			const tvbTokenTotalsAllChains = Object.entries(
				tvbPerChainTotals,
			).reduce(
				(acc, [chain, totals]) =>
					addAll(acc, totals, (tk: string) =>
						decodeTokenKey(tk, chain),
					),
				{} as Record<string, bigint>,
			);

			const tvbGrandTotal = {
				[getTokenInfo(TokenEnum.APEX).label]: BigInt(0),
				[getTokenInfo(TokenEnum.ADA).label]: BigInt(0),
			};

			Object.entries(tvbPerChainTotals).forEach(
				([chainKey, perToken]) => {
					const chain = toChainEnum(chainKey);

					Object.entries(perToken).forEach(([tokenKey, value]) => {
						const currencyInfo = correlateTokenToACurrency(
							skylineSettings.cardanoChainsNativeTokens,
							chain,
							tokenKey,
						);

						if (currencyInfo) {
							tvbGrandTotal[currencyInfo.label] += BigInt(
								value || '0',
							);
						}
					});
				},
			);

			return {
				tvbPerChainTotals,
				tvbTokenTotalsAllChains,
				tvbGrandTotal,
			};
		}, [
			skylineChains,
			tvbChains,
			skylineSettings.cardanoChainsNativeTokens,
		]);

	const { lzPerChainTotals, lzTokenTotalsAllChains, lzGrandTotal } =
		useMemo(() => {
			const lzSet = new Set(layerZeroChains);
			const lzPerChainTotals = Object.fromEntries(
				Object.entries(tvbChains)
					.filter(([chain]) => lzSet.has(chain as ChainEnum))
					.map(([chain, tokenMap]) => [
						chain,
						sumChain(tokenMap, (k: string) =>
							isApexChain(chain)
								? k === 'amount'
								: k !== 'amount',
						),
					]),
			);

			const lzTokenTotalsAllChains = Object.entries(
				lzPerChainTotals,
			).reduce(
				(acc, [chain, totals]) =>
					addAll(acc, totals, (tk: string) =>
						decodeTokenKey(tk, chain),
					),
				{} as Record<string, bigint>,
			);

			const lzGrandTotal = Object.values(lzTokenTotalsAllChains).reduce(
				(a, b) => a + b,
				BigInt(0),
			);

			return { lzPerChainTotals, lzTokenTotalsAllChains, lzGrandTotal };
		}, [tvbChains]);

	const [tab, setTab] = useState(0);

	return (
		<BasePage>
			<Box id="audit" className="skyline-bridge-section">
				<Box className="audit-section">
					<Tabs
						value={tab}
						onChange={(_, v) => setTab(v)}
						aria-label="Audit tabs"
					>
						<Tab label="UTxO World" />
						<Tab label="EVM World" />
					</Tabs>

					{tab === 0 && (
						<SkylinePanel
							chains={chains}
							chainKeys={chainKeys}
							perChainTotals={perChainTotals}
							tokenTotalsAllChains={tokenTotalsAllChains}
							tvbPerChainTotals={tvbPerChainTotals}
							tvbTokenTotalsAllChains={tvbTokenTotalsAllChains}
							tvbGrandTotal={tvbGrandTotal}
							skylineChains={skylineChains}
						/>
					)}

					{tab === 1 && (
						<LayerZeroPanel
							lzPerChainTotals={lzPerChainTotals}
							lzTokenTotalsAllChains={lzTokenTotalsAllChains}
							lzGrandTotal={lzGrandTotal}
						/>
					)}
				</Box>
			</Box>
		</BasePage>
	);
};

export default AuditPage;
