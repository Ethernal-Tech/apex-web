import { getAllFilteredAction } from "@/lib/api/transaction";
import { ErrorResponse, tryCatchJsonByAction } from "@/lib/fetchUtils";
import appSettings from "@/settings/appSettings";
import {
  BridgeTransactionFilterDto,
  BridgeTransactionResponseDto,
  ChainEnum,
} from "@/swagger/apexBridgeApiService";

export type BridgeTxListQuery = {
  /** 0-based page index (API). */
  page: number;
  perPage: number;
  orderBy?: string;
  order?: "asc" | "desc";
  senderAddress?: string;
  originChain?: string;
  destinationChain?: string;
  receiverAddress?: string;
  amountFrom?: string;
  amountTo?: string;
  nativeTokenAmountFrom?: string;
  nativeTokenAmountTo?: string;
};

export async function fetchBridgeTransactions(
  query: BridgeTxListQuery,
): Promise<BridgeTransactionResponseDto> {
  const body = new BridgeTransactionFilterDto({
    page: query.page,
    perPage: query.perPage,
    orderBy: query.orderBy,
    order: query.order,
    senderAddress: query.senderAddress || undefined,
    originChain: query.originChain
      ? (query.originChain as ChainEnum)
      : undefined,
    destinationChain: query.destinationChain
      ? (query.destinationChain as ChainEnum)
      : undefined,
    receiverAddress: query.receiverAddress || undefined,
    amountFrom: query.amountFrom || undefined,
    amountTo: query.amountTo || undefined,
    nativeTokenAmountFrom: query.nativeTokenAmountFrom || undefined,
    nativeTokenAmountTo: query.nativeTokenAmountTo || undefined,
    onlyReactor: appSettings.isSkyline ? undefined : true,
  });

  const response = await tryCatchJsonByAction(
    getAllFilteredAction.bind(null, body),
    false,
  );
  if (response instanceof ErrorResponse) {
    throw new Error(response.err);
  }
  return response;
}
