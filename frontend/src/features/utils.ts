import { BaseAddress, EnterpriseAddress, RewardAddress } from "./Address/addreses";
import { CardanoAddress } from "./Address/interfaces";
import { CardanoNetworkType, KeyHashSize, StakeCredential, StakeCredentialType } from "./Address/types";


export const toBytes = (hex: string): Uint8Array => {
    if (hex.length % 2 === 0 && /^[0-9A-F]*$/i.test(hex))
        return Buffer.from(hex, 'hex');

    return Buffer.from(hex, 'utf-8');
};

const NewStakeCredential = (data: Uint8Array, isScript: boolean): (StakeCredential | undefined) => {
    if (data.length < KeyHashSize) {
        return;
    }

    return {
        Kind: isScript ? StakeCredentialType.ScriptStakeCredentialType : StakeCredentialType.KeyStakeCredentialType,
        Payload: data.slice(0, KeyHashSize),
    }
}

export const NewAddressFromBytes = (data: Uint8Array): (
    CardanoAddress | undefined
) => {
    if (data.length === 0) {
        return;
    }

    const header = data[0];
    const netID = (header & 0x0F) as CardanoNetworkType;

    switch ((header & 0xF0) >> 4) {
        // 1000: byron address
        case 0b1000:
            // unsupported
            return;
        // 0100, 0101 pointer address
        case 0b0100:
        case 0b0101:
            // unsupported
            return;
        // 0000: base address: keyhash28,keyhash28
        // 0001: base address: scripthash28,keyhash28
        // 0010: base address: keyhash28,scripthash28
        // 0011: base address: scripthash28,scripthash28
        case 0b0000:
        case 0b0001:
        case 0b0010:
        case 0b0011: {
            if (data.length < 1 + KeyHashSize * 2) {
                //fmt.Errorf("%w: expect %d got %d", ErrInvalidData, 1+KeyHashSize*2, len(data))
                return;
            }

            const payment = NewStakeCredential(data.slice(1), (header&(1<<4)) > 0);
            if (!payment) {
                return;
            }

            const stake = NewStakeCredential(data.slice(1 + KeyHashSize), (header&(1<<5)) > 0);
            if (!stake) {
                return;
            }

            return new BaseAddress(
                netID,
                payment,
                stake,
                data.slice(1 + 2 * KeyHashSize),
            );
        }
        // 0110: enterprise address: keyhash28
        // 0111: enterprise address: scripthash28
        case 0b0110:
        case 0b0111: {
            if (data.length !== KeyHashSize + 1) {
                //fmt.Errorf("%w: expect %d got %d", ErrInvalidData, 1+KeyHashSize, len(data))
                return;
            }

            const payment = NewStakeCredential(data.slice(1), (header&(1<<4)) > 0)
            if (!payment) {
                return;
            }

            return new EnterpriseAddress(
                netID,
                payment,
            );
        }
        case 0b1110:
        case 0b1111: {
            if (data.length !== KeyHashSize + 1) {
                //fmt.Errorf("%w: expect %d got %d", ErrInvalidData, 1+KeyHashSize, len(data))
                return;
            }

            const stake = NewStakeCredential(data.slice(1), (header&(1<<4)) > 0)
            if (!stake) {
                return;
            }

            return new RewardAddress(
                netID,
                stake,
            );
        }
        default:
            return;
    }
}