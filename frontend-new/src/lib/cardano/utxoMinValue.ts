import { normalizeNativeTokenKey } from "@/lib/wallet/tokenKey";
import { captureAndThrowError, captureException } from "@/lib/wallet/errors";
import { toBytes } from "@/lib/wallet/utils";

export type SimpleUtxo = {
  output: {
    address: string;
    amount: { unit: string; quantity: string }[];
  };
  input: { outputIndex: number; txHash: string };
};

const COINS_PER_UTXO_BYTE = 4310;

export function createUtxo(
  outputAddr: string,
  outputLovelace: string,
  outputTokens: { [key: string]: string },
  inputTxHash = "",
  inputOutputIndex = 0,
): SimpleUtxo {
  return {
    output: {
      address: outputAddr,
      amount: [
        {
          unit: "lovelace",
          quantity: outputLovelace,
        },
        ...Object.keys(outputTokens).map((unit) => ({
          unit: normalizeNativeTokenKey(unit),
          quantity: outputTokens[unit],
        })),
      ],
    },
    input: { outputIndex: inputOutputIndex, txHash: inputTxHash },
  };
}

export function getAssetsSumMap(utxos: SimpleUtxo[]) {
  const assetsSumMap: { [unit: string]: bigint } = {};
  for (const utxo of utxos) {
    for (const asset of utxo.output.amount) {
      if (!assetsSumMap[asset.unit]) {
        assetsSumMap[asset.unit] = BigInt(0);
      }
      assetsSumMap[asset.unit] += BigInt(asset.quantity || "0");
    }
  }
  return assetsSumMap;
}

async function calculateMinValueOfAggregatedUtxo(
  utxos: SimpleUtxo[],
): Promise<number> {
  if (utxos.length === 0) {
    captureAndThrowError(
      "UTxO array is empty",
      "utxoMinValue.ts",
      "calculateMinValueOfAggregatedUtxo",
    );
  }

  const {
    Address,
    AssetName,
    Assets,
    BigNum,
    DataCost,
    MultiAsset,
    ScriptHash,
    TransactionOutput,
    Value,
    min_ada_for_output,
  } = await import("@emurgo/cardano-serialization-lib-asmjs");

  const value = Value.new(BigNum.from_str("0"));
  const multiAsset = MultiAsset.new();

  for (const utxo of utxos) {
    for (const asset of utxo.output.amount) {
      if (asset.unit === "lovelace") {
        const existing = value.coin();
        value.set_coin(existing.checked_add(BigNum.from_str(asset.quantity)));
        continue;
      }

      const policyId = asset.unit.slice(0, 56);
      const assetNameHex = asset.unit.slice(56);
      const quantity = BigNum.from_str(asset.quantity);

      const policyScriptHash = ScriptHash.from_bytes(toBytes(policyId));
      const assetName = AssetName.new(toBytes(assetNameHex));

      const assets = multiAsset.get(policyScriptHash) || Assets.new();
      const current = assets.get(assetName) || BigNum.from_str("0");

      assets.insert(assetName, current.checked_add(quantity));
      multiAsset.insert(policyScriptHash, assets);
    }
  }

  if (multiAsset.len() > 0) {
    value.set_multiasset(multiAsset);
  }

  const address = Address.from_bech32(utxos[0].output.address);
  return +min_ada_for_output(
    TransactionOutput.new(address, value),
    DataCost.new_coins_per_byte(BigNum.from_str("" + COINS_PER_UTXO_BYTE)),
  ).to_str();
}

export async function calculateTokenUtxoMinValue(
  utxo: SimpleUtxo,
  defaultMinUtxo: number,
): Promise<number> {
  try {
    return Math.max(
      await calculateMinValueOfAggregatedUtxo([utxo]),
      defaultMinUtxo,
    );
  } catch (e) {
    console.log("error while calculating minUtxo value", e);
    captureException(e, {
      tags: {
        component: "utxoMinValue.ts",
        action: "calculateTokenUtxoMinValue",
      },
    });
  }

  return 2 * defaultMinUtxo;
}

export async function calculateChangeUtxoMinValue(
  utxos: SimpleUtxo[] | undefined,
  defaultMinUtxo: number,
): Promise<number> {
  if (!utxos) {
    return defaultMinUtxo;
  }

  try {
    return Math.max(
      await calculateMinValueOfAggregatedUtxo(utxos),
      defaultMinUtxo,
    );
  } catch (e) {
    console.log("error while calculating change utxo min value", e);
    captureException(e, {
      tags: {
        component: "utxoMinValue.ts",
        action: "calculateChangeUtxoMinValue",
      },
    });
  }

  return Object.keys(getAssetsSumMap(utxos)).length > 1
    ? 2 * defaultMinUtxo
    : defaultMinUtxo;
}
