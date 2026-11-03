import { BridgeTransaction } from 'src/bridgeTransaction/bridgeTransaction.entity';
import { BridgingRequestNotFinalStatesMap } from 'src/bridgeTransaction/bridgeTransaction.helper';
import { ChainEnum } from 'src/common/enum';
import { convertWeiToDfmByChain } from 'src/utils/generalUtils';
import {
	DEFAULT_DECIMAL_CONVERSION_RATE,
	decodeOftPayload,
	LayerZeroMessage,
} from './layerZeroScan.helper';

export type LayerZeroMappingContext = {
	/** the chain of a LayerZero endpoint id, from LAYERZERO_CONFIG */
	chainOfEid: (eid: number) => ChainEnum | undefined;
	/** the token a transfer in this direction moves, 0 for the currency of the origin chain */
	tokenIDOf: (
		originChain: ChainEnum,
		destinationChain: ChainEnum,
	) => number | undefined;
	/** decimal conversion rate of the OFT on a chain */
	conversionRateOf: (chain: ChainEnum) => bigint | undefined;
};

export type LayerZeroMappingResult =
	| { entity: BridgeTransaction }
	| { skipReason: string };

/**
 * Maps a LayerZero scan message to a bridging transaction, with the same values
 * the frontend shows for a LayerZero transfer while it waits for it:
 * - currency transfers (from nexus): amount = bridged amount
 * - token transfers (from base, bsc): nativeTokenAmount = bridged amount, the
 *   currency that went with it is the LayerZero fee, which is not bridged
 */
export const mapLayerZeroMessage = (
	message: LayerZeroMessage,
	ctx: LayerZeroMappingContext,
): LayerZeroMappingResult => {
	const sourceTxHash = message.source.txHash;
	const originChain = ctx.chainOfEid(message.pathway.srcEid);
	const destinationChain = ctx.chainOfEid(message.pathway.dstEid);

	if (!sourceTxHash) {
		return { skipReason: 'message without source tx' };
	}

	if (!originChain || !destinationChain) {
		return {
			skipReason: `pathway ${message.pathway.srcEid} -> ${message.pathway.dstEid} is not configured`,
		};
	}

	const tokenID = ctx.tokenIDOf(originChain, destinationChain);
	if (tokenID === undefined) {
		return {
			skipReason: `no token pair for ${originChain} -> ${destinationChain}`,
		};
	}

	const transfer = decodeOftPayload(message.payload);
	if (!transfer) {
		return { skipReason: 'message body is not an OFT transfer' };
	}

	// the amount is in shared decimals, it scales by the rate of the OFT it left
	const rate =
		ctx.conversionRateOf(originChain) ?? DEFAULT_DECIMAL_CONVERSION_RATE;
	const amountWei = String(transfer.amountSD * rate);
	const amount = String(convertWeiToDfmByChain(amountWei, originChain));
	const createdAt = message.source.sentAt ?? new Date();

	const entity = new BridgeTransaction();

	entity.sourceTxHash = sourceTxHash.toLowerCase();
	entity.originChain = originChain;
	entity.destinationChain = destinationChain;
	entity.senderAddress = (message.source.from ?? '').toLowerCase();
	entity.receiverAddresses = transfer.receiver;
	entity.tokenID = tokenID;
	entity.status = message.status;
	entity.isRefund = false;
	entity.destinationTxHash = message.destination.txHash;
	entity.createdAt = createdAt;
	entity.finishedAt = !BridgingRequestNotFinalStatesMap[message.status]
		? message.destination.deliveredAt ?? createdAt
		: undefined;

	if (tokenID === 0) {
		entity.amount = amount;
		entity.amountWei = amountWei;
		entity.nativeTokenAmount = '0';
		entity.tokenAmountWei = '0';
	} else {
		entity.amount = '0';
		entity.amountWei = '0';
		entity.nativeTokenAmount = amount;
		entity.tokenAmountWei = amountWei;
	}

	// LayerZero status is tracked through the scan API, no TTL is needed
	entity.txRaw = '';
	entity.isLayerZero = true;
	entity.activeFrom = new Date();
	entity.clientID = null;

	return { entity };
};
