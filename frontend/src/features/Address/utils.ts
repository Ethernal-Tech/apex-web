import { bech32 } from "bech32"
import { CardanoNetworkType } from "./types"

export type Bech32DecodeData = {
    prefix: string,
    data: Uint8Array,
}

export const IsAddressWithValidPrefix = (addr: string): boolean => {
    return addr.startsWith('addr') ||
            addr.startsWith('vector') ||
            addr.startsWith('stake');
}

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
    try {
        const converted = convertBits(data, 8, 5, true);
        return bech32.encode(hrp, converted, 1000);
    } catch (e) {
        console.log('failed to Bech32EncodeFromBase256. err:', e)
    }
}

export const Bech32DecodeToBase256 = (raw: string): Bech32DecodeData | undefined => {
    try {
        const decoded = bech32.decode(raw, 1000)
        const converted = convertBits(decoded.words, 5, 8, false);
        const data = new Uint8Array(converted.length);
        data.set(converted);
    
        return { prefix: decoded.prefix, data };
    } catch (e) {
        console.log('failed to Bech32DecodeToBase256. err:', e)
    }
}