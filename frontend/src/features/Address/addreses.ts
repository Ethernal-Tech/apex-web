import { CardanoAddress } from "./interfaces";
import { StakeCredential, CardanoNetworkType, KeyHashSize } from "./types";
import { Bech32EncodeFromBase256, GetPrefix, GetStakePrefix } from "./utils";

export class BaseAddress implements CardanoAddress {
    constructor(
        public Network: CardanoNetworkType,
        public Payment: StakeCredential,
        public Stake: StakeCredential,
        public Extra: Uint8Array,
    ) {}

    GetPayment(): StakeCredential {
        return this.Payment;
    }
    GetStake(): StakeCredential {
        return this.Stake;
    }
    GetNetwork(): CardanoNetworkType {
        return this.Network;
    }
    Bytes(): Uint8Array {
        const bytes = new Uint8Array(KeyHashSize * 2 + 1 + this.Extra.length);
        bytes[0] = ((this.Payment.Kind) << 4) | ((this.Stake.Kind) << 5) | ((this.Network) & 0xf);

        bytes.set(this.Payment.Payload, 1);
        bytes.set(this.Stake.Payload, KeyHashSize + 1);
        bytes.set(this.Extra, KeyHashSize * 2 + 1);

        return bytes;
    }
    String(network?: number): string | undefined {
        return Bech32EncodeFromBase256(GetPrefix(network || this.Network), this.Bytes())
    }
}

export class EnterpriseAddress implements CardanoAddress {
    constructor(
        public Network: CardanoNetworkType,
        public Payment: StakeCredential,
    ) {}

    GetPayment(): StakeCredential {
        return this.Payment;
    }
    GetStake(): StakeCredential {
        throw new Error('not available');
    }
    GetNetwork(): CardanoNetworkType {
        return this.Network;
    }
    Bytes(): Uint8Array {
        const bytes = new Uint8Array(KeyHashSize + 1);
        bytes[0] = 0b01100000 | ((this.Payment.Kind) << 4) | ((this.Network) & 0xf);

        bytes.set(this.Payment.Payload, 1);

        return bytes;
    }
    String(network?: number): string | undefined {
        return Bech32EncodeFromBase256(GetPrefix(network || this.Network), this.Bytes())
    }
}

export class RewardAddress implements CardanoAddress {
    constructor(
        public Network: CardanoNetworkType,
        public Stake: StakeCredential,
    ) {}

    GetPayment(): StakeCredential {
        throw new Error('not available');
    }
    GetStake(): StakeCredential {
        return this.Stake;
    }
    GetNetwork(): CardanoNetworkType {
        return this.Network;
    }
    Bytes(): Uint8Array {
        const bytes = new Uint8Array(KeyHashSize + 1);
        bytes[0] = 0b11100000 | ((this.Stake.Kind) << 4) | ((this.Network) & 0xf);

        bytes.set(this.Stake.Payload, 1);

        return bytes;
    }
    String(network?: number): string | undefined {
        return Bech32EncodeFromBase256(GetStakePrefix(network || this.Network), this.Bytes())
    }
}