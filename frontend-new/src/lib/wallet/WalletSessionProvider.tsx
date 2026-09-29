import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { settingsQueryOptions } from "@/lib/api/settings";
import type { SettingsResponse } from "@/lib/api/settings";
import {
  connectWallet,
  disconnectWallet,
  initChainsState,
  loadStoredWalletName,
  onLoadWallet,
  type ConnectHandlers,
  type WalletAccount,
  type WalletSession,
} from "@/lib/wallet/connect";

type WalletSessionContextValue = {
  walletName: string | null;
  account: WalletAccount | null;
  isFullyLoggedIn: boolean;
  isConnecting: boolean;
  sourceChain: string;
  destinationChain: string;
  connect: (
    srcChain: string,
    dstChain: string,
    settings: SettingsResponse,
  ) => Promise<boolean>;
  disconnect: () => Promise<void>;
  handlers: ConnectHandlers;
};

const WalletSessionContext = createContext<WalletSessionContextValue | null>(
  null,
);

export function WalletSessionProvider({ children }: { children: ReactNode }) {
  const { data: settings } = useQuery(settingsQueryOptions);

  const initialChains = useMemo(() => initChainsState(), []);
  const [sourceChain, setSourceChain] = useState(initialChains.chain);
  const [destinationChain, setDestinationChain] = useState(
    initialChains.destinationChain,
  );

  const [walletName, setWalletName] = useState<string | null>(() =>
    loadStoredWalletName(),
  );
  const [account, setAccount] = useState<WalletAccount | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("selected_wallet_account");
  }, []);

  const applySession = useCallback((session: WalletSession | null) => {
    if (!session) {
      setWalletName(null);
      setAccount(null);
      return;
    }
    setWalletName(session.walletName);
    setAccount(session.account);
  }, []);

  const handlers = useMemo<ConnectHandlers>(
    () => ({
      onSession: applySession,
      onError: (message: string) => toast.error(message),
    }),
    [applySession],
  );

  useEffect(() => {
    if (!walletName) return;
    if (!settings || Object.keys(settings.directionConfig).length === 0) {
      return;
    }

    const chains = initChainsState();
    setSourceChain(chains.chain);
    setDestinationChain(chains.destinationChain);

    setIsConnecting(true);
    void onLoadWallet(
      walletName,
      chains.chain,
      chains.destinationChain,
      settings,
      handlers,
    ).finally(() => setIsConnecting(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const connect = useCallback(
    async (
      srcChain: string,
      dstChain: string,
      connectSettings: SettingsResponse,
    ) => {
      setIsConnecting(true);
      try {
        setSourceChain(srcChain);
        setDestinationChain(dstChain);
        return await connectWallet(
          srcChain,
          dstChain,
          connectSettings,
          handlers,
        );
      } finally {
        setIsConnecting(false);
      }
    },
    [handlers],
  );

  const disconnect = useCallback(async () => {
    await disconnectWallet(handlers);
  }, [handlers]);

  const value = useMemo<WalletSessionContextValue>(
    () => ({
      walletName,
      account,
      isFullyLoggedIn: Boolean(walletName && account?.account),
      isConnecting,
      sourceChain,
      destinationChain,
      connect,
      disconnect,
      handlers,
    }),
    [
      walletName,
      account,
      isConnecting,
      sourceChain,
      destinationChain,
      connect,
      disconnect,
      handlers,
    ],
  );

  return (
    <WalletSessionContext.Provider value={value}>
      {children}
    </WalletSessionContext.Provider>
  );
}

export function useWalletSession(): WalletSessionContextValue {
  const ctx = useContext(WalletSessionContext);
  if (!ctx) {
    throw new Error(
      "useWalletSession must be used within WalletSessionProvider",
    );
  }
  return ctx;
}
