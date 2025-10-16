import { CardanoAddress } from './interfaces';
import {
	StakeCredential,
	CardanoNetworkType,
	KeyHashSize,
	StakeCredentialType,
} from './types';
import {
	Bech32DecodeToBase256,
	Bech32EncodeFromBase256,
	GetPrefix,
	GetStakePrefix,
	IsAddressWithValidPrefix,
} from './utils';

const NewStakeCredential = (
	data: Uint8Array,
	isScript: boolean,
): StakeCredential | undefined => {
	if (data.length < KeyHashSize) {
		return;
	}

	return {
		Kind: isScript
			? StakeCredentialType.ScriptStakeCredentialType
			: StakeCredentialType.KeyStakeCredentialType,
		Payload: data.slice(0, KeyHashSize),
	};
};

export const NewAddress = (raw: string): CardanoAddress | undefined => {
	if (!IsAddressWithValidPrefix(raw)) {
		return;
	}

	const decoded = Bech32DecodeToBase256(raw);
	if (!decoded) {
		return;
	}

	return NewAddressFromBytes(decoded.data);
};

export const NewAddressFromBytes = (
	data: Uint8Array,
): CardanoAddress | undefined => {
	if (data.length === 0) {
		return;
	}

	const header = data[0];
	const netID = (header & 0x0f) as CardanoNetworkType;

	switch ((header & 0xf0) >> 4) {
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

			const payment = NewStakeCredential(
				data.slice(1),
				(header & (1 << 4)) > 0,
			);
			if (!payment) {
				return;
			}

			const stake = NewStakeCredential(
				data.slice(1 + KeyHashSize),
				(header & (1 << 5)) > 0,
			);
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

			const payment = NewStakeCredential(
				data.slice(1),
				(header & (1 << 4)) > 0,
			);
			if (!payment) {
				return;
			}

			return new EnterpriseAddress(netID, payment);
		}
		case 0b1110:
		case 0b1111: {
			if (data.length !== KeyHashSize + 1) {
				//fmt.Errorf("%w: expect %d got %d", ErrInvalidData, 1+KeyHashSize, len(data))
				return;
			}

			const stake = NewStakeCredential(
				data.slice(1),
				(header & (1 << 4)) > 0,
			);
			if (!stake) {
				return;
			}

			return new RewardAddress(netID, stake);
		}
		default:
			return;
	}
};

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
		bytes[0] =
			(this.Payment.Kind << 4) |
			(this.Stake.Kind << 5) |
			(this.Network & 0xf);

		bytes.set(this.Payment.Payload, 1);
		bytes.set(this.Stake.Payload, KeyHashSize + 1);
		bytes.set(this.Extra, KeyHashSize * 2 + 1);

		return bytes;
	}
	String(network?: number): string | undefined {
		return Bech32EncodeFromBase256(
			GetPrefix(network || this.Network),
			this.Bytes(),
		);
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
		bytes[0] = 0b01100000 | (this.Payment.Kind << 4) | (this.Network & 0xf);

		bytes.set(this.Payment.Payload, 1);

		return bytes;
	}
	String(network?: number): string | undefined {
		return Bech32EncodeFromBase256(
			GetPrefix(network || this.Network),
			this.Bytes(),
		);
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
		bytes[0] = 0b11100000 | (this.Stake.Kind << 4) | (this.Network & 0xf);

		bytes.set(this.Stake.Payload, 1);

		return bytes;
	}
	String(network?: number): string | undefined {
		return Bech32EncodeFromBase256(
			GetStakePrefix(network || this.Network),
			this.Bytes(),
		);
	}
}
