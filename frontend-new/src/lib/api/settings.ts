import { queryOptions } from "@tanstack/react-query";
import appSettings from "@/settings/appSettings";
import type {
  BridgingSettingsDirectionConfigDto,
  BridgingSettingsEcosystemTokenDto,
  SettingsFullResponseDto,
  SettingsResponseDto,
  TxTypeEnum,
} from "@/swagger/apexBridgeApiService";
import { setTokenNames } from "../tokenInfo";

export type LayerZeroChains = Record<
  string,
  { oftAddress: string; chainID: number; txType: TxTypeEnum }
>;

export interface ISettingsState {
  settingsPerMode: { [key: string]: SettingsResponseDto };
  layerZeroChains: LayerZeroChains;
  enabledChains: string[];
  directionConfig: { [key: string]: BridgingSettingsDirectionConfigDto };
  ecosystemTokens: BridgingSettingsEcosystemTokenDto[];
  bridgingAddresses: string[];
  reactorValidatorStatus: boolean | undefined;
}

/** App settings shape from `GET /settings` (full response, LZ chains keyed). */
export type SettingsResponse = ISettingsState;

function mapLayerZeroChains(
  chains: SettingsFullResponseDto["layerZeroChains"] | undefined,
): LayerZeroChains {
  return (chains ?? []).reduce<LayerZeroChains>((acc, cfg) => {
    const key = String(cfg.chain).toLowerCase();
    acc[key] = {
      oftAddress: cfg.oftAddress,
      chainID: cfg.chainID,
      txType: cfg.txType as TxTypeEnum,
    };
    return acc;
  }, {});
}

export async function fetchSettings(): Promise<SettingsResponse> {
  const res = await fetch(`${appSettings.apiUrl}/settings`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to load settings (${res.status})`);
  }

  const payload = (await res.json()) as SettingsFullResponseDto;
  setTokenNames(payload.ecosystemTokens ?? []);

  return {
    settingsPerMode: payload.settingsPerMode ?? {},
    layerZeroChains: mapLayerZeroChains(payload.layerZeroChains),
    enabledChains: payload.enabledChains ?? [],
    directionConfig: payload.directionConfig ?? {},
    ecosystemTokens: payload.ecosystemTokens ?? [],
    bridgingAddresses: [],
    reactorValidatorStatus: undefined,
  };
}

export const settingsQueryOptions = queryOptions({
  queryKey: ["settings"] as const,
  queryFn: fetchSettings,
  staleTime: 60_000,
});
