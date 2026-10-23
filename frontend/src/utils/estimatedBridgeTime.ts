import { useEffect, useState } from 'react';
import appSettings from '../settings/appSettings';
import { ChainEnum } from '../swagger/apexBridgeApiService';

/** Time range in minutes. Use equal min/max for a fixed value. */
type TimeRangeMinutes = {
	min: number;
	max: number;
};

type NetworkEstimatedTimeConfig = {
	marginMinutes: number;
	chainConfirmationMinutes: Partial<Record<ChainEnum, TimeRangeMinutes>>;
	defaultChainConfirmationMinutes: TimeRangeMinutes;
};

const fixedMinutes = (minutes: number): TimeRangeMinutes => ({
	min: minutes,
	max: minutes,
});

// The static estimate, used for directions without enough recently finished
// transactions. Same values as the skyline frontend uses for these chains.
const BRIDGE_PROCESSING_MINUTES: TimeRangeMinutes = { min: 1, max: 3 };

const ESTIMATED_TIME_CONFIG: Record<
	'mainnet' | 'testnet',
	NetworkEstimatedTimeConfig
> = {
	testnet: {
		marginMinutes: 2,
		defaultChainConfirmationMinutes: fixedMinutes(5),
		chainConfirmationMinutes: {
			[ChainEnum.Prime]: fixedMinutes(5),
			[ChainEnum.Vector]: fixedMinutes(1),
			[ChainEnum.Nexus]: fixedMinutes(1),
		},
	},
	mainnet: {
		marginMinutes: 3,
		defaultChainConfirmationMinutes: fixedMinutes(5),
		chainConfirmationMinutes: {
			[ChainEnum.Prime]: fixedMinutes(15),
			[ChainEnum.Vector]: fixedMinutes(3),
			[ChainEnum.Nexus]: fixedMinutes(1),
		},
	},
};

const formatMinutesRange = (minMinutes: number, maxMinutes: number): string => {
	const min = Math.max(0, minMinutes);
	const max = Math.max(min, maxMinutes);

	return min === max
		? `${min} minute${min === 1 ? '' : 's'}`
		: `${min}-${max} minutes`;
};

/** Source chain confirmation + bridge processing + destination chain confirmation */
export const getStaticEstimatedBridgeTime = (
	srcChain: ChainEnum,
	dstChain: ChainEnum,
	isMainnet: boolean = appSettings.isMainnet,
): string => {
	const config = ESTIMATED_TIME_CONFIG[isMainnet ? 'mainnet' : 'testnet'];
	const src =
		config.chainConfirmationMinutes[srcChain] ??
		config.defaultChainConfirmationMinutes;
	const dst =
		config.chainConfirmationMinutes[dstChain] ??
		config.defaultChainConfirmationMinutes;

	return formatMinutesRange(
		src.min + BRIDGE_PROCESSING_MINUTES.min + dst.min,
		src.max +
			BRIDGE_PROCESSING_MINUTES.max +
			dst.max +
			config.marginMinutes,
	);
};

/** How long bridging takes in one direction, measured from its latest finished transactions. */
export type BridgingDuration = {
	originChain: string;
	destinationChain: string;
	medianSeconds: number;
	p90Seconds: number;
	sampleCount: number;
};

/** `GET /stats/bridgingDurations` - directions without enough recent transactions are omitted. */
export type BridgingDurations = {
	directions: BridgingDuration[];
};

export const fetchBridgingDurations = async (): Promise<BridgingDurations> => {
	const res = await fetch(`${appSettings.apiUrl}/stats/bridgingDurations`, {
		headers: { Accept: 'application/json' },
	});
	if (!res.ok) {
		throw new Error(`Failed to load bridging durations (${res.status})`);
	}

	return res.json() as Promise<BridgingDurations>;
};

/**
 * Formats a measured duration range (median to 90th percentile) in whole minutes,
 * rounded up so the estimate does not promise more than the bridge delivers.
 */
export const formatMeasuredBridgeTime = (
	medianSeconds: number,
	p90Seconds: number,
): string => {
	if (p90Seconds < 60) {
		return 'Less than a minute';
	}

	return formatMinutesRange(
		Math.max(1, Math.ceil(medianSeconds / 60)),
		Math.ceil(p90Seconds / 60),
	);
};

/**
 * The estimated bridging time of a direction. Measured from its latest finished
 * transactions when there are enough of them, otherwise the static estimate.
 */
export const getEstimatedBridgeTime = (
	srcChain: ChainEnum,
	dstChain: ChainEnum,
	durations?: BridgingDurations,
): string => {
	const measured = durations?.directions.find(
		(d) => d.originChain === srcChain && d.destinationChain === dstChain,
	);

	return measured
		? formatMeasuredBridgeTime(measured.medianSeconds, measured.p90Seconds)
		: getStaticEstimatedBridgeTime(srcChain, dstChain);
};

// web-api recalculates the durations every 10 minutes
const REFRESH_MS = 10 * 60 * 1000;

/** Bridging durations, loaded once and refreshed periodically. Undefined until loaded. */
export const useBridgingDurations = (): BridgingDurations | undefined => {
	const [durations, setDurations] = useState<BridgingDurations>();

	useEffect(() => {
		let cancelled = false;

		const load = async () => {
			try {
				const result = await fetchBridgingDurations();
				if (!cancelled) {
					setDurations(result);
				}
			} catch (e) {
				// the static estimate is shown instead
				console.log('Failed to load bridging durations', e);
			}
		};

		load();
		const handle = setInterval(load, REFRESH_MS);

		return () => {
			cancelled = true;
			clearInterval(handle);
		};
	}, []);

	return durations;
};
