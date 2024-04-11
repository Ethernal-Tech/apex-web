import { ChainEnum } from "../swagger/apexBridgeApiService";

export type FilterValuesType = {
    receiverAddress: string | undefined;
    destinationChain: ChainEnum | string | undefined;
    amountFrom: string | undefined;
    amountTo: string | undefined;
    page: number | undefined;
    perPage: number | undefined;
    orderBy: string | undefined;
    order: string | undefined;
}

export function transformFilters(filters: FilterValuesType) {
    return {
        receiverAddress: filters.receiverAddress,
        destinationChain: filters.destinationChain,
        amountFrom: Number(filters.amountFrom),
        amountTo: Number(filters.amountTo),
        page: filters.page,
        perPage: filters.perPage,
        orderBy: filters.orderBy,
        order: filters.order
    };
}
