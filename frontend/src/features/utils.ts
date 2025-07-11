import appSettings from "../settings/appSettings";
import { ChainEnum } from "../swagger/apexBridgeApiService";
import { UtxoRetrieverEnum } from "./enums";
import walletHandler from "./WalletHandler";

const supportedWalletVersion = { major: 2, minor: 0, patch: 9, build: 14 };

export const getUtxoRetrieverType = (chain: ChainEnum): UtxoRetrieverEnum => {
    if (chain === ChainEnum.Nexus) {
	    return UtxoRetrieverEnum.Wallet;
    }

    const walletVersion = walletHandler.version();
    const utxoRetrieverConfig = !!appSettings.utxoRetriever && appSettings.utxoRetriever[chain];

    if (utxoRetrieverConfig && (utxoRetrieverConfig.force || !walletSupported(walletVersion))) {
        if (utxoRetrieverConfig.url) {
            if (utxoRetrieverConfig.type === UtxoRetrieverEnum.Blockfrost) {
                return UtxoRetrieverEnum.Blockfrost;
            } else if (utxoRetrieverConfig.type === UtxoRetrieverEnum.Ogmios) {
                return UtxoRetrieverEnum.Ogmios;
            } else {
                console.log(`Unknown utxo retriever type: ${utxoRetrieverConfig.type}`);
            }
        } else {
            console.log(`utxo retriever url not provided for: ${utxoRetrieverConfig.type}`);
        }
    }

	return UtxoRetrieverEnum.Wallet;
}

const walletSupported = (walletVersion: any): boolean => {
    if (!walletVersion ||
        typeof walletVersion.major !== 'number' ||
        typeof walletVersion.minor !== 'number' ||
        typeof walletVersion.patch !== 'number' ||
        typeof walletVersion.build !== 'number' ) {
            // invalid wallet version format
        return false;
    }

    const { major, minor, patch, build } = supportedWalletVersion;
    return (walletVersion.major > major ||
        (walletVersion.major === major && walletVersion.minor > minor) ||
        (walletVersion.major === major && walletVersion.minor === minor && walletVersion.patch > patch) ||
        (walletVersion.major === major && walletVersion.minor === minor && walletVersion.patch === patch && walletVersion.build >= build)
    )
}