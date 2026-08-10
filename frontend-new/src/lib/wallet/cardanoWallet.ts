/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAssetsSumMap, type SimpleUtxo } from "@/lib/cardano/utxoMinValue";
import { NewAddressFromBytes } from "@/lib/wallet/address/addreses";
import { ApexBridgeNetwork } from "@/lib/wallet/enums";
import { captureAndThrowError, captureException } from "@/lib/wallet/errors";
import type { UtxoRetriever } from "@/lib/wallet/utxoRetriever";
import { toBytes } from "@/lib/wallet/utils";

type WalletInfo = {
  name: string;
  icon: string;
  version: string;
};

type Cip30Api = {
  getNetworkId: () => Promise<number>;
  getChangeAddress: () => Promise<string>;
  getBalance: () => Promise<string>;
  getUtxos?: () => Promise<string[] | undefined>;
  getCollateral?: (params?: {
    amount?: string;
  }) => Promise<string[] | undefined>;
  signTx: (tx: string, partialSign?: boolean) => Promise<string>;
  submitTx: (tx: string) => Promise<string>;
  experimental?: {
    getConnectedNetworkId?: () => Promise<string>;
    appVersion?: unknown;
  };
};

type Cip30Injected = {
  name: string;
  icon: string;
  apiVersion: string;
  enable: () => Promise<Cip30Api>;
};

export const SUPPORTED_WALLETS = ["eternl"] as const;

const ETERNL_NETWORK_ID_TO_APEX_BRIDGE_NETWORK: Record<
  string,
  ApexBridgeNetwork
> = {
  mainnet: ApexBridgeNetwork.MainnetCardano,
  preview: ApexBridgeNetwork.PreviewCardano,
  afvt: ApexBridgeNetwork.TestnetVector,
  afvm: ApexBridgeNetwork.MainnetVector,
  afpt: ApexBridgeNetwork.TestnetPrime,
  afpm: ApexBridgeNetwork.MainnetPrime,
};

class CardanoWalletHandler implements UtxoRetriever {
  private _enabledWallet: Cip30Api | undefined;

  getNativeAPI = () => this._enabledWallet;

  getInstalledWallets = (): WalletInfo[] => {
    if (typeof window === "undefined") return [];
    const cardano = (window as any).cardano as
      | Record<string, Cip30Injected>
      | undefined;
    if (!cardano) return [];

    return SUPPORTED_WALLETS.filter((sw) => cardano[sw] !== undefined).map(
      (sw) => ({
        name: cardano[sw].name,
        icon: cardano[sw].icon,
        version: cardano[sw].apiVersion,
      }),
    );
  };

  enable = async (walletName: string) => {
    const cardano = (window as any).cardano as
      | Record<string, Cip30Injected>
      | undefined;
    const key =
      SUPPORTED_WALLETS.find(
        (sw) =>
          sw === walletName.toLowerCase() ||
          cardano?.[sw]?.name?.toLowerCase() === walletName.toLowerCase(),
      ) ?? walletName.toLowerCase();
    const injected = cardano?.[key];

    if (!injected) {
      captureAndThrowError(
        `Wallet ${walletName} not found.`,
        "cardanoWallet.ts",
        "enable",
      );
    }

    this._enabledWallet = await injected.enable();
  };

  clearEnabledWallet = () => {
    this._enabledWallet = undefined;
  };

  checkWallet = (): boolean => !!this._enabledWallet;

  version = (): unknown => {
    const nativeAPI = this.getNativeAPI();
    const experimentalAPI = nativeAPI?.experimental;
    if (!experimentalAPI) {
      captureAndThrowError(
        "experimental not defined",
        "cardanoWallet.ts",
        "version",
      );
    }

    const appVersion = experimentalAPI.appVersion;
    if (!appVersion) {
      captureAndThrowError(
        "appVersion not defined",
        "cardanoWallet.ts",
        "version",
      );
    }

    return appVersion;
  };

  private _checkWalletAndThrow = () => {
    if (!this.checkWallet()) {
      captureAndThrowError(
        "Wallet not enabled",
        "cardanoWallet.ts",
        "_checkWalletAndThrow",
      );
    }
  };

  getNetwork = async (): Promise<ApexBridgeNetwork | undefined> => {
    this._checkWalletAndThrow();

    try {
      const experimentalAPI = this._enabledWallet!.experimental;
      if (!experimentalAPI) {
        captureAndThrowError(
          "experimental not defined",
          "cardanoWallet.ts",
          "getNetwork",
        );
      }

      const getConnectedNetworkId = experimentalAPI.getConnectedNetworkId;
      if (!getConnectedNetworkId) {
        captureAndThrowError(
          "getConnectedNetworkId not defined",
          "cardanoWallet.ts",
          "getNetwork",
        );
      }

      const eternlNetworkId = await getConnectedNetworkId();
      return ETERNL_NETWORK_ID_TO_APEX_BRIDGE_NETWORK[eternlNetworkId];
    } catch (e) {
      console.log(e);
      captureException(e, {
        tags: { component: "cardanoWallet.ts", action: "getNetwork" },
      });
    }
  };

  getChangeAddress = async (): Promise<string> => {
    this._checkWalletAndThrow();

    try {
      const networkId = await this.getNetworkId();
      const changeAddr = await this._enabledWallet!.getChangeAddress();
      const changeAddrBytes = toBytes(changeAddr);

      const addr = NewAddressFromBytes(changeAddrBytes);
      const realChangeAddr = addr?.String(networkId);
      if (realChangeAddr) {
        return realChangeAddr;
      }
    } catch (e) {
      console.log(e);
      captureException(e, {
        tags: { component: "cardanoWallet.ts", action: "getChangeAddress" },
      });
    }

    return await this._enabledWallet!.getChangeAddress();
  };

  getNetworkId = async (): Promise<number> => {
    this._checkWalletAndThrow();
    return await this._enabledWallet!.getNetworkId();
  };

  getAllUtxos = async (includeCollateral = true): Promise<SimpleUtxo[]> => {
    this._checkWalletAndThrow();

    const address = await this.getChangeAddress();
    const networkId = await this.getNetworkId();
    const allUtxosMap: { [key: string]: SimpleUtxo } = {};

    const utxoHexes = (await this._enabledWallet!.getUtxos?.()) ?? [];
    for (const hex of utxoHexes) {
      const utxo = await parseCip30Utxo(hex, networkId);
      if (utxo.output.address === address) {
        allUtxosMap[`${utxo.input.txHash}#${utxo.input.outputIndex}`] = utxo;
      }
    }

    if (includeCollateral) {
      const collateralHexes =
        (await this._enabledWallet!.getCollateral?.()) ?? [];
      for (const hex of collateralHexes) {
        const utxo = await parseCip30Utxo(hex, networkId);
        if (utxo.output.address === address) {
          allUtxosMap[`${utxo.input.txHash}#${utxo.input.outputIndex}`] = utxo;
        }
      }
    }

    return Object.values(allUtxosMap);
  };

  getBalance = async (
    allUtxos?: SimpleUtxo[],
  ): Promise<Record<string, bigint>> => {
    this._checkWalletAndThrow();
    if (allUtxos === undefined) {
      allUtxos = await this.getAllUtxos();
    }
    return getAssetsSumMap(allUtxos);
  };

  /**
   * Same flow as Mesh `BrowserWallet.signTx`:
   * CIP-30 returns a witness set → merge vkeys into the unsigned tx → return full CBOR.
   * @see @meshsdk/wallet BrowserWallet.signTx / addBrowserWitnesses
   */
  signTx = async (
    unsignedTx: string,
    partialSign?: boolean,
  ): Promise<string> => {
    this._checkWalletAndThrow();
    const witness = await this._enabledWallet!.signTx(unsignedTx, partialSign);
    if (witness === "") {
      return unsignedTx;
    }
    return await addBrowserWitnesses(unsignedTx, witness);
  };

  submitTx = async (tx: string): Promise<string> => {
    this._checkWalletAndThrow();
    return await this._enabledWallet!.submitTx(tx);
  };
}

/**
 * Port of MeshSDK `BrowserWallet.addBrowserWitnesses`.
 *
 * Must keep the original tx body bytes — re-encoding via `Transaction.new()`
 * changes the body CBOR and invalidates wallet signatures (Eternl TxSendError 3100).
 * `FixedTransaction` preserves the raw body while attaching vkey witnesses.
 */
async function addBrowserWitnesses(
  unsignedTx: string,
  witnesses: string,
): Promise<string> {
  const { FixedTransaction, TransactionWitnessSet } =
    await import("@emurgo/cardano-serialization-lib-asmjs");

  const walletWitnessSet = TransactionWitnessSet.from_bytes(toBytes(witnesses));
  const cWitness = walletWitnessSet.vkeys();
  if (cWitness === undefined) {
    return unsignedTx;
  }

  const fixedTx = FixedTransaction.from_bytes(toBytes(unsignedTx));
  for (let i = 0; i < cWitness.len(); i++) {
    fixedTx.add_vkey_witness(cWitness.get(i));
  }

  return fixedTx.to_hex();
}

async function parseCip30Utxo(
  hex: string,
  networkId: number,
): Promise<SimpleUtxo> {
  const { TransactionUnspentOutput } =
    await import("@emurgo/cardano-serialization-lib-asmjs");
  const tuo = TransactionUnspentOutput.from_bytes(toBytes(hex));
  const input = tuo.input();
  const output = tuo.output();
  const value = output.amount();

  const amount: { unit: string; quantity: string }[] = [
    { unit: "lovelace", quantity: value.coin().to_str() },
  ];

  const multi = value.multiasset();
  if (multi) {
    const policies = multi.keys();
    for (let i = 0; i < policies.len(); i++) {
      const policy = policies.get(i);
      const assets = multi.get(policy);
      if (!assets) continue;
      const names = assets.keys();
      for (let j = 0; j < names.len(); j++) {
        const assetName = names.get(j);
        const qty = assets.get(assetName);
        if (!qty) continue;
        const nameBytes = assetName.name();
        const nameHex = Array.from(nameBytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        amount.push({
          unit: `${policy.to_hex()}${nameHex}`,
          quantity: qty.to_str(),
        });
      }
    }
  }

  const txHashBytes = input.transaction_id().to_bytes();
  const txHash = Array.from(txHashBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const addrBytes = output.address().to_bytes();
  const customAddr = NewAddressFromBytes(addrBytes);
  const address = customAddr?.String(networkId) ?? output.address().to_bech32();

  return {
    input: {
      txHash,
      outputIndex: input.index(),
    },
    output: {
      address,
      amount,
    },
  };
}

const cardanoWalletHandler = new CardanoWalletHandler();
export default cardanoWalletHandler;
