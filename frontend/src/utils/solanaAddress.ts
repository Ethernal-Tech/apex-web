import bs58 from 'bs58';
import { Point } from '@noble/ed25519';

/** Validates a base58 Solana address is 32 bytes and on the ed25519 curve (not a PDA). */
export function isValidSolanaOnCurveAddress(address: string): boolean {
	try {
		const decoded = bs58.decode(address);
		if (decoded.length !== 32) {
			return false;
		}
		Point.fromBytes(decoded).assertValidity();
		return true;
	} catch {
		return false;
	}
}
