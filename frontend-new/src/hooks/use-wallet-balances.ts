import { useEffect, useState } from "react";
import type { SettingsResponse } from "@/lib/api/settings";
import type { SimpleUtxo } from "@/lib/cardano/utxoMinValue";
import {
  getUpdateBalanceInterval,
  safeFetchWalletBalances,
  type WalletBalances,
} from "@/lib/wallet/balance";

/** Periodically refresh wallet balances while connected. */
export function useWalletBalances({
  account,
  srcChain,
  dstChain,
  settings,
}: {
  /** Connected address; a change refetches the balances right away. */
  account: string | null;
  srcChain: string | undefined;
  dstChain: string | undefined;
  settings: SettingsResponse | undefined;
}): {
  balances: WalletBalances;
  utxos: SimpleUtxo[] | undefined;
  loading: boolean;
} {
  const [balances, setBalances] = useState<WalletBalances>({});
  const [utxos, setUtxos] = useState<SimpleUtxo[] | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!account || !srcChain || !dstChain || !settings) {
      setBalances({});
      setUtxos(undefined);
      setLoading(false);
      return;
    }

    // balances of the previous account/direction must not stay visible meanwhile
    setBalances({});
    setUtxos(undefined);

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
          setBalances(next.balance);
          setUtxos(next.utxos);
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
  }, [account, srcChain, dstChain, settings]);

  return { balances, utxos, loading };
}
