import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import { TransactionScreen } from "@/components/TransactionScreen";
import { getByTxHashAction } from "@/lib/api/transaction";
import { loadPendingTx, removePendingTx } from "@/lib/bridging/pendingTx";
import { getExplorerTxUrl } from "@/lib/explorer";
import { ErrorResponse, tryCatchJsonByAction } from "@/lib/fetchUtils";
import { pageHead } from "@/lib/seo";
import {
  ChainEnum,
  type BridgeTransactionDto,
} from "@/swagger/apexBridgeApiService";

export const Route = createFileRoute(
  "/transaction/pending/$originChain/$txHash",
)({
  head: ({ params }) =>
    pageHead({
      title: "Skyline Bridge - Transaction",
      description: "Track your Skyline bridging transaction across chains.",
      path: `/transaction/pending/${params.originChain}/${params.txHash}`,
      index: false,
    }),
  component: PendingTransactionPage,
});

const POLL_INTERVAL_MS = 2000;
// after this long the page tells the user that recording takes longer than usual
const SLOW_AFTER_MS = 5 * 60 * 1000;

// hex hash (cardano, evm) or base58 signature (solana)
const TX_HASH_REGEX = /^(0x)?[0-9a-fA-F]{64}$|^[1-9A-HJ-NP-Za-km-z]{64,90}$/;

const chainValues = new Set<string>(Object.values(ChainEnum));

/**
 * Shows a bridging tx submitted to the source chain before web-api records it.
 * The page polls web-api by source chain and tx hash, and switches to the
 * regular transaction page once the tx is recorded.
 */
function PendingTransactionPage() {
  const { originChain, txHash } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isValid = chainValues.has(originChain) && TX_HASH_REGEX.test(txHash);

  // present only in the tab that submitted the tx
  const pendingTx = useMemo(
    () => (isValid ? loadPendingTx(originChain, txHash) : undefined),
    [isValid, originChain, txHash],
  );

  const recordedQuery = useQuery({
    queryKey: ["bridgeTransactionByHash", originChain, txHash] as const,
    enabled: isValid,
    retry: false,
    queryFn: async (): Promise<BridgeTransactionDto | null> => {
      const response = await tryCatchJsonByAction(
        getByTxHashAction.bind(null, originChain, txHash),
        false,
      );

      // not recorded yet (or web-api not reachable), keep waiting
      return response instanceof ErrorResponse ? null : response;
    },
    refetchInterval: (query) => (query.state.data ? false : POLL_INTERVAL_MS),
  });

  const recordedTx = recordedQuery.data;

  useEffect(() => {
    if (!recordedTx) return;

    // the regular page renders the recorded tx right away instead of loading it
    queryClient.setQueryData(["bridgeTransaction", recordedTx.id], recordedTx);
    removePendingTx(originChain, txHash);
    void navigate({
      to: "/transaction/$id",
      params: { id: String(recordedTx.id) },
      replace: true,
    });
  }, [recordedTx, originChain, txHash, navigate, queryClient]);

  const isSlow = useIsSlow(pendingTx?.createdAt);
  const explorerUrl = isValid
    ? getExplorerTxUrl(
        originChain as ChainEnum,
        txHash,
        pendingTx?.isLayerZero,
        true,
      )
    : undefined;

  const returnPath = `/transaction/pending/${originChain}/${txHash}`;

  if (!isValid) {
    return (
      <TransactionScreen
        txKey={returnPath}
        returnPath={returnPath}
        placeholder={
          <>
            <AlertCircle className="h-8 w-8 text-[oklch(0.78_0.19_25)]" />
            <p className="text-sm text-foreground">
              Transaction wasn&apos;t found
            </p>
            <p className="max-w-md text-xs text-muted-foreground">
              The link doesn&apos;t point to a valid bridging transaction.
            </p>
          </>
        }
      />
    );
  }

  return (
    <TransactionScreen
      tx={pendingTx}
      txKey={returnPath}
      returnPath={returnPath}
      isLoading={!pendingTx && recordedQuery.isLoading}
      notice={isSlow && <SlowNotice explorerUrl={explorerUrl} />}
      placeholder={
        <>
          <Loader2 className="h-8 w-8 animate-spin text-[oklch(0.85_0.15_235)]" />
          <p className="text-sm text-foreground">
            Waiting for the transaction to be recorded
          </p>
          <p className="max-w-md break-all font-mono text-xs text-muted-foreground">
            {txHash}
          </p>
          {isSlow && (
            <p className="max-w-md text-xs text-muted-foreground">
              This is taking longer than usual. The transaction will appear once
              it is confirmed on the source chain.
            </p>
          )}
          {explorerUrl && <ExplorerLink url={explorerUrl} />}
        </>
      }
    />
  );
}

/** true once SLOW_AFTER_MS passed since the given time (or since the page opened) */
function useIsSlow(since: Date | undefined) {
  const [openedAt] = useState(() => Date.now());
  const start = since?.getTime() ?? openedAt;
  const [isSlow, setIsSlow] = useState(
    () => Date.now() - start >= SLOW_AFTER_MS,
  );

  useEffect(() => {
    const remaining = SLOW_AFTER_MS - (Date.now() - start);
    if (remaining <= 0) {
      setIsSlow(true);
      return;
    }

    const timeout = setTimeout(() => setIsSlow(true), remaining);
    return () => clearTimeout(timeout);
  }, [start]);

  return isSlow;
}

function SlowNotice({ explorerUrl }: { explorerUrl?: string }) {
  return (
    <div className="mb-6 flex flex-col items-center gap-2 rounded-2xl border border-[oklch(0.88_0.12_85_/_0.3)] bg-[oklch(0.88_0.12_85_/_0.06)] p-4 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
      <span>
        This is taking longer than usual. The transaction will be tracked once
        it is confirmed on the source chain.
      </span>
      {explorerUrl && <ExplorerLink url={explorerUrl} />}
    </div>
  );
}

function ExplorerLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[oklch(0.85_0.15_235)] hover:underline"
    >
      <ExternalLink className="h-3.5 w-3.5" /> View in explorer
    </a>
  );
}
