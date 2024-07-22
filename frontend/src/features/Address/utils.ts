import { bech32 } from "bech32"
import { CardanoNetworkType } from "./types"


export const GetPrefix = (n: CardanoNetworkType): string => {
	switch (n) {
	case CardanoNetworkType.VectorTestNetNetwork:
		return "vector_test"
	case CardanoNetworkType.VectorMainNetNetwork:
		return "vector"
	case CardanoNetworkType.MainNetNetwork:
		return "addr"
	case CardanoNetworkType.TestNetNetwork:
		return "addr_test"
	default:
		return "" // not handled but dont raise an error
	}
}
export const GetStakePrefix = (n: CardanoNetworkType): string => {
	switch (n) {
	case CardanoNetworkType.MainNetNetwork:
    case CardanoNetworkType.VectorMainNetNetwork:
		return "stake"
	case CardanoNetworkType.TestNetNetwork:
    case CardanoNetworkType.VectorTestNetNetwork:
		return "stake_test"
	default:
		return "" // not handled but dont raise an error
	}
}

const convertBits = (
    data: ArrayLike<number>,
    inBits: number,
    outBits: number,
    pad: boolean,
): number[] => {
    let value = 0;
    let bits = 0;
    const maxV = (1 << outBits) - 1;

    const result: number[] = [];
    for (let i = 0; i < data.length; ++i) {
        value = (value << inBits) | data[i];
        bits += inBits;

        while (bits >= outBits) {
            bits -= outBits;
            result.push((value >> bits) & maxV);
        }
    }

    if (pad) {
        if (bits > 0) {
            result.push((value << (outBits - bits)) & maxV);
        }
    } else {
        if (bits >= inBits) throw Error('Excess padding');
        if ((value << (outBits - bits)) & maxV) throw Error('Non-zero padding');
    }

    return result;
}

export const Bech32EncodeFromBase256 = (hrp: string, data: Uint8Array): (string | undefined) => {
    const converted = convertBits(data, 8, 5, true);
    if (!converted) {
        return;
    }

    return bech32.encode(hrp, converted, 1000);
}