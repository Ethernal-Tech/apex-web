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
import { isAdaToken, isApexToken } from '../../components/Audit/token';
import { adaID, apexID } from '../../settings/token';

const sumToken = (m: Record<string, bigint>): bigint =>
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
): Record<string, bigint> => {
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

	const tokenTotalsAllChains = useMemo(
		() =>
			Object.values(perChainTotals).reduce(
				(acc, totals) => addAll(acc, totals),
				{} as Record<string, bigint>,
			),
		[perChainTotals],
	);

	const skylineChains = useMemo<ChainEnum[]>(() => {
		if (!settings) return [];
		return Object.keys(
			settings.settingsPerMode[BridgingModeEnum.Skyline]
				.allowedDirections,
		) as unknown as ChainEnum[];
	}, [settings]);

	const { tvbPerChainTotals, tvbTokenTotalsAllChains, tvbGrandTotal } =
		useMemo(() => {
			const skylineSet = new Set(skylineChains);

			const tvbPerChainTotals = Object.fromEntries(
				Object.entries(tvbChains)
					.filter(([chain]) => skylineSet.has(chain as ChainEnum))
					.map(([chain, tokenMap]) => [chain, sumChain(tokenMap)]),
			);

			const tvbTokenTotalsAllChains = Object.values(
				tvbPerChainTotals,
			).reduce(
				(acc, totals) => addAll(acc, totals),
				{} as Record<string, bigint>,
			);

			const tvbGrandTotal = Object.values(tvbPerChainTotals).reduce(
				(accumulator, perTokenMap) => {
					for (const [tokenKey, value] of Object.entries(
						perTokenMap,
					)) {
						if (value === BigInt(0)) {
							continue;
						}

						if (isApexToken(+tokenKey)) {
							accumulator[apexID] =
								(accumulator[apexID] ?? BigInt(0)) + value;
						} else if (isAdaToken(+tokenKey)) {
							accumulator[adaID] =
								(accumulator[adaID] ?? BigInt(0)) + value;
						}
					}
					return accumulator;
				},
				{} as Record<string, bigint>,
			);
			return {
				tvbPerChainTotals,
				tvbTokenTotalsAllChains,
				tvbGrandTotal,
			};
		}, [skylineChains, tvbChains]);

	const { lzPerChainTotals, lzTokenTotalsAllChains, lzGrandTotal } =
		useMemo(() => {
			const lzSet = new Set(layerZeroChains);

			const lzPerChainTotals = Object.fromEntries(
				Object.entries(tvbChains)
					.filter(([chain]) => lzSet.has(chain as ChainEnum))
					.map(([chain, tokenMap]) => [chain, sumChain(tokenMap)]),
			);

			const lzTokenTotalsAllChains = Object.values(
				lzPerChainTotals,
			).reduce(
				(acc, totals) => addAll(acc, totals),
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
