import { useEffect, useState } from "react";
import type { SettingsResponse } from "@/lib/api/settings";
import {
  getUpdateBalanceInterval,
  safeFetchWalletBalances,
  type WalletBalances,
} from "@/lib/wallet/balance";

/** Periodically refresh wallet balances while connected. */
export function useWalletBalances({
  enabled,
  srcChain,
  dstChain,
  settings,
}: {
  enabled: boolean;
  srcChain: string | undefined;
  dstChain: string | undefined;
  settings: SettingsResponse | undefined;
}): {
  balances: WalletBalances;
  loading: boolean;
} {
  const [balances, setBalances] = useState<WalletBalances>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !srcChain || !dstChain || !settings) {
      setBalances({});
      setLoading(false);
      return;
    }

    let cancelled = false;
    let inFlight = false;

    const tick = async () => {
      if (inFlight || cancelled) return;
      inFlight = true;
      try {
        const next = await safeFetchWalletBalances(
          srcChain,
          dstChain,
          settings,
        );
        if (!cancelled && next) {
          setBalances(next);
        }
      } finally {
        inFlight = false;
        if (!cancelled) setLoading(false);
      }
    };

    setLoading(true);
    void tick();
    const handle = window.setInterval(
      () => void tick(),
      getUpdateBalanceInterval(srcChain),
    );

    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, [enabled, srcChain, dstChain, settings]);

  return { balances, loading };
}
