import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { TransactionScreen } from "@/components/TransactionScreen";
import { getAction } from "@/lib/api/transaction";
import { isStatusFinal } from "@/lib/bridging/txStatusUi";
import { ErrorResponse, tryCatchJsonByAction } from "@/lib/fetchUtils";
import { type BridgeTransactionDto } from "@/swagger/apexBridgeApiService";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/transaction/$id")({
  head: ({ params }) =>
    pageHead({
      title: "Skyline Bridge - Transaction",
      description: "Track your Skyline bridging transaction across chains.",
      path: `/transaction/${params.id}`,
      index: false,
    }),
  component: TransactionPage,
});

/** `bridgeTransactions.id` is a Postgres int4 PK. */
const PG_INT4_MAX = 2_147_483_647;

function parseTransactionRouteId(raw: string): number | undefined {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > PG_INT4_MAX) return undefined;
  return n;
}

function TransactionPage() {
  const { id } = Route.useParams();

  const txId = parseTransactionRouteId(id);
  const idIsValid = txId !== undefined;

  const txQuery = useQuery({
    queryKey: ["bridgeTransaction", txId] as const,
    enabled: idIsValid,
    retry: false,
    queryFn: async (): Promise<BridgeTransactionDto> => {
      if (txId === undefined) {
        throw new Error("Invalid id");
      }
      const response = await tryCatchJsonByAction(
        getAction.bind(null, txId),
        false,
      );
      if (response instanceof ErrorResponse) {
        throw new Error(response.err);
      }
      return response;
    },
    refetchInterval: (query) => {
      const tx = query.state.data;
      if (!tx || isStatusFinal(tx.status)) return false;
      return 5000;
    },
  });

  const loadError =
    txQuery.error instanceof Error ? txQuery.error.message : null;
  const isMissingTx =
    !idIsValid ||
    (txQuery.isError && /not found|invalid id/i.test(loadError ?? ""));

  return (
    <TransactionScreen
      tx={txQuery.data}
      txKey={id}
      returnPath={`/transaction/${id}`}
      isLoading={txQuery.isLoading}
      placeholder={
        (txQuery.isError || !idIsValid) && (
          <>
            <AlertCircle className="h-8 w-8 text-[oklch(0.78_0.19_25)]" />
            {isMissingTx ? (
              <>
                <p className="text-sm text-foreground">
                  Transaction #{id} wasn&apos;t found
                </p>
                <p className="max-w-md text-xs text-muted-foreground">
                  There&apos;s no bridging transaction with this ID.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-foreground">
                  Couldn&apos;t load transaction #{id}
                </p>
                <p className="max-w-md text-xs text-muted-foreground">
                  {loadError ?? "Something went wrong. Please try again."}
                </p>
              </>
            )}
          </>
        )
      }
    />
  );
}
