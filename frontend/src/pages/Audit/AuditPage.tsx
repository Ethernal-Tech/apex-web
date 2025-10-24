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
import { decodeTokenKey, isApexChain } from '../../utils/tokenUtils';
import { TokenEnum } from '../../features/enums';

const sumToken = (m: Record<string, bigint>) =>
	Object.values(m).reduce((a, b) => a + b, BigInt(0));

const sumChain = (
	chain: string,
	tokenMap: Record<string, Record<string, bigint>> | Record<string, bigint>,
	_blank: boolean,
): Record<string, bigint> => {
	return Object.fromEntries(
		Object.entries(tokenMap).map(([k, v]) => [
			chain !== ChainEnum.Cardano || !(k === 'amount' || k === 'lovelace')
				? k
				: 'Ada',
			typeof v === 'bigint' ? v : sumToken(v as Record<string, bigint>),
		]),
	);
};

const addAll = (
	_: string,
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

const addAllTVL = (
	_: string,
	into: Record<string, bigint>,
	totals: Record<string, bigint>,
	mapKey?: (k: string) => string,
) => {
	for (const [t, v] of Object.entries(totals)) {
		const key = mapKey ? mapKey(t) : t;
		if (key === TokenEnum.Ada || key === TokenEnum.wADA) {
			into[TokenEnum.Ada] = (into[key] ?? BigInt(0)) + v;
		} else {
			into[TokenEnum.APEX] = (into[key] ?? BigInt(0)) + v;
		}
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

	const perChainTotals = useMemo(() => {
		return Object.fromEntries(
			Object.entries(chains).map(([chain, tokenMap]) => [
				chain,
				sumChain(chain, tokenMap, false),
			]),
		);
	}, [chains]);

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
			addAllTVL(chain, acc, totals);
		}
		return acc;
	}, [perChainTotals]);

	// Now use those values inside your other memos
	const { tvbPerChainTotals, tvbTokenTotalsAllChains, tvbGrandTotal } =
		useMemo(() => {
			const skylineSet = new Set(skylineChains); // ⬅️ use memoized value
			const tvbPerChainTotals = Object.fromEntries(
				Object.entries(tvbChains)
					.filter(([chain]) => skylineSet.has(chain as ChainEnum))
					.map(([chain, tokenMap]) => [
						chain,
						sumChain(
							chain,
							tokenMap,
							isApexChain(chain) || chain === ChainEnum.Cardano,
						),
					]),
			);

			const tvbTokenTotalsAllChains = Object.entries(
				tvbPerChainTotals,
			).reduce(
				(acc, [chain, totals]) => addAll(chain, acc, totals),
				{} as Record<string, bigint>,
			);

			const tvbGrandTotal: Record<string, bigint> = {};
			tvbGrandTotal[TokenEnum.Ada] = BigInt(0);
			tvbGrandTotal[TokenEnum.APEX] = BigInt(0);

			for (const [key, value] of Object.entries(
				tvbTokenTotalsAllChains,
			)) {
				if (
					key === TokenEnum.Ada ||
					decodeTokenKey(key) === TokenEnum.wADA
				) {
					tvbGrandTotal[TokenEnum.Ada] += value;
				} else {
					tvbGrandTotal[TokenEnum.APEX] += value;
				}
			}

			return {
				tvbPerChainTotals,
				tvbTokenTotalsAllChains,
				tvbGrandTotal,
			};
		}, [tvbChains, skylineChains]);

	const { lzPerChainTotals, lzTokenTotalsAllChains, lzGrandTotal } =
		useMemo(() => {
			const lzSet = new Set(layerZeroChains);
			const lzPerChainTotals = Object.fromEntries(
				Object.entries(tvbChains)
					.filter(([chain]) => lzSet.has(chain as ChainEnum))
					.map(([chain, tokenMap]) => [
						chain,
						sumChain(chain, tokenMap, isApexChain(chain)),
					]),
			);

			const lzTokenTotalsAllChains = Object.entries(
				lzPerChainTotals,
			).reduce(
				(acc, [chain, totals]) => addAll(chain, acc, totals),
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
						<Tab label="Skyline" />
						<Tab label="LayerZero" />
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
