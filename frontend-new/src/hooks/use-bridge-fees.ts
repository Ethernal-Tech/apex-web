import { useEffect, useRef, useState } from "react";
import type { ISettingsState } from "@/lib/api/settings";
import {
  estimateBridgeFees,
  type BridgeFeeEstimate,
} from "@/lib/bridging/estimateFees";
import { BridgingModeEnum } from "@/lib/bridging/mode";

const DEBOUNCE_MS = 500;

export type UseBridgeFeesArgs = {
  enabled: boolean;
  settings: ISettingsState | undefined;
  srcChain: string;
  dstChain: string;
  senderAddress: string;
  destinationAddress: string;
  amountDisplay: string;
  tokenID: number | undefined;
  currencyID: number | undefined;
  currencyBalanceDfm: string;
};

export type UseBridgeFeesResult = BridgeFeeEstimate & {
  loading: boolean;
};

const EMPTY: BridgeFeeEstimate = {
  userWalletFeeDfm: undefined,
  bridgeTxFeeDfm: "0",
  operationFeeDfm: "0",
  bridgingMode: BridgingModeEnum.Unknown,
};

/** Debounced live fee estimation (500ms). */
export function useBridgeFees(args: UseBridgeFeesArgs): UseBridgeFeesResult {
  const {
    enabled,
    settings,
    srcChain,
    dstChain,
    senderAddress,
    destinationAddress,
    amountDisplay,
    tokenID,
    currencyID,
    currencyBalanceDfm,
  } = args;

  const [estimate, setEstimate] = useState<BridgeFeeEstimate>(EMPTY);
  const [loading, setLoading] = useState(false);
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (!enabled || !settings || tokenID === undefined) {
      setEstimate(EMPTY);
      setLoading(false);
      return;
    }

    const handle = window.setTimeout(() => {
      const reqId = ++reqIdRef.current;
      setLoading(true);

      void estimateBridgeFees({
        settings,
        srcChain,
        dstChain,
        senderAddress,
        destinationAddress,
        amountDisplay,
        tokenID,
        currencyID,
        currencyBalanceDfm,
      }).then((result) => {
        if (reqId !== reqIdRef.current) return;
        setEstimate(result);
        setLoading(false);
      });
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(handle);
    };
  }, [
    enabled,
    settings,
    srcChain,
    dstChain,
    senderAddress,
    destinationAddress,
    amountDisplay,
    tokenID,
    currencyID,
    currencyBalanceDfm,
  ]);

  return { ...estimate, loading };
}
