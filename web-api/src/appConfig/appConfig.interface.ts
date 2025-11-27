export type LogLevel =
	| 'emerg'
	| 'alert'
	| 'crit'
	| 'error'
	| 'warning'
	| 'notice'
	| 'info'
	| 'debug';

export interface LayerZeroNetworkConfig {
	chain: string;
	oftAddress: `0x${string}`;
	chainID: number;
	txType: string;
}

export interface AppConfig {
	app: {
		logLevel: LogLevel;
		port: number;
		corsAllowList: string[];
		isMainnet: boolean;
	};
	features: {
		useCentralizedBridge: boolean;
		statusUpdateModesSupported: string[];
	};
	bridge: {
		ethTxTtlInc: number;
		recentInputsThresholdMinutes: number;
		addresses: {
			nexusBridging: `0x${string}`;
			nexusCentralizedBridging: `0x${string}`;
		};
	};
	services: {
		oracleSkylineUrl: string;
		oracleReactorUrl: string;
		cardanoApiSkylineUrl: string;
		cardanoApiReactorUrl: string;
		centralizedApiUrl: string;
	};
	database: {
		host: string;
		port: number;
		name: string;
		ssl: boolean;
		migrationsTableName: string;
		entities: string[];
		migrations: string[];
	};
	email: {
		contactEmail: string;
		smtpHost: string;
		smtpPort: number;
	};
	layerzero: {
		apiUrl: string;
		scanUrl: string;
		networks: LayerZeroNetworkConfig[];
	};
}

export type DeepPartial<T> = T extends object
	? { [K in keyof T]?: DeepPartial<T[K]> }
	: T;
