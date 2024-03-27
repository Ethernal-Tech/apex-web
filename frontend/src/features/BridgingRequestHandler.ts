import { requestAddressBalanceAction, requestBridgeBalanceAction } from "../actions/balance"
import { BridgingRequestState, Chain } from "./enums"

const POOL_BALANCES_INTERVAL_MS = 1000

export type BridgingHandlerNotification = {
    sourceAddrBalance: number | undefined,
    sourceBridgeBalance: number | undefined,
    destinationAddrBalance: number | undefined,
    destinationBridgeBalance: number | undefined,
    status: BridgingRequestState,
}

class BridgingRequestHandler {
    sourceChain: Chain

    sourceAddr: string
    sourceAddrBalance: number | undefined

    destinationAddr: string
    destinationAddrBalance: number | undefined

    sourceBridgeBalance: number | undefined
    destinationBridgeBalance: number | undefined

    poolingHandler: NodeJS.Timer | undefined

    status: BridgingRequestState
    notifyCallback: (notificationObj: BridgingHandlerNotification) => void

    constructor(
        sourceChain: Chain,
        sourceAddr: string,
        sourceAddrBalance: number | undefined,
        sourceBridgeBalance: number | undefined,
        destinationAddr: string,
        destinationAddrBalance: number | undefined,
        destinationBridgeBalance: number | undefined,
        notifyCallback: (notificationObj: BridgingHandlerNotification) => void,
    ) {
        this.sourceChain = sourceChain;
        this.sourceAddr = sourceAddr;
        this.sourceAddrBalance = sourceAddrBalance;
        this.sourceBridgeBalance = sourceBridgeBalance;
        this.destinationAddr = destinationAddr;
        this.destinationAddrBalance = destinationAddrBalance;
        this.destinationBridgeBalance = destinationBridgeBalance;
        this.status = BridgingRequestState.RequestedOnSource;
        this.notifyCallback = notifyCallback;

        this.poolingHandler = setInterval(this._poolBalances, POOL_BALANCES_INTERVAL_MS);
    }

    _dispose = () => {
        this.poolingHandler && clearInterval(this.poolingHandler);
        this.poolingHandler = undefined;
    }

    _notify = () => {
        this.notifyCallback({
            sourceAddrBalance: this.sourceAddrBalance,
            sourceBridgeBalance: this.sourceBridgeBalance,
            destinationAddrBalance: this.destinationAddrBalance,
            destinationBridgeBalance: this.destinationBridgeBalance,
            status: this.status
        })
    }

    _setBalances = (
        sourceAddrBalance: number | undefined,
        sourceBridgeBalance: number | undefined,
        destinationAddrBalance: number | undefined,
        destinationBridgeBalance: number | undefined,
    ) => {
        if (this.status === BridgingRequestState.RequestedOnSource) {
            if (sourceBridgeBalance !== this.sourceBridgeBalance) {
                this.status = BridgingRequestState.RequestedOnDestination;
            }
        }
        else if (this.status === BridgingRequestState.RequestedOnDestination) {
            if (destinationAddrBalance !== this.destinationAddrBalance) {
                this.status = BridgingRequestState.Finished;
                this._dispose();
            }
        }

        this.sourceAddrBalance = sourceAddrBalance;
        this.sourceBridgeBalance = sourceBridgeBalance;
        this.destinationAddrBalance = destinationAddrBalance;
        this.destinationBridgeBalance = destinationBridgeBalance;
        this._notify();
    }

    _poolBalances = async () => {
        let sourceAddrBalance;
        if (this.sourceAddr) {
            sourceAddrBalance = await requestAddressBalanceAction({
                chainId: this.sourceChain,
                address: this.sourceAddr,
            });
        }

        const sourceBridgeBalance = await requestBridgeBalanceAction({
            chainId: this.sourceChain,
        });

        let destinationAddrBalance;
        if (this.destinationAddr) {
            destinationAddrBalance = await requestAddressBalanceAction({
                chainId: this.sourceChain === Chain.PRIME ? Chain.VECTOR : Chain.PRIME,
                address: this.destinationAddr,
            });
        }

        const destinationBridgeBalance = await requestBridgeBalanceAction({
            chainId: this.sourceChain === Chain.PRIME ? Chain.VECTOR : Chain.PRIME,
        });

        this._setBalances(sourceAddrBalance, sourceBridgeBalance, destinationAddrBalance, destinationBridgeBalance);
    }
}

export default BridgingRequestHandler;