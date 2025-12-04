import { BridgingSettingsDirectionConfigDto } from 'src/settings/settings.dto';
import { BridgeTransaction } from './bridgeTransaction.entity';
import {
	getCurrencyIDFromDirectionConfig,
	getWrappedCurrencyIDFromDirectionConfig,
} from 'src/settings/utils';

export const getRealTokenIDFromEntity = (
	dirConfig: {
		[key: string]: BridgingSettingsDirectionConfigDto;
	},
	transaction: BridgeTransaction,
) => {
	if (transaction.tokenID) return transaction.tokenID;

	if (BigInt(transaction.nativeTokenAmount) === BigInt(0)) {
		return getCurrencyIDFromDirectionConfig(dirConfig, transaction.originChain);
	}

	// for backward compatibility reasons
	return getWrappedCurrencyIDFromDirectionConfig(
		dirConfig,
		transaction.originChain,
	);
};
