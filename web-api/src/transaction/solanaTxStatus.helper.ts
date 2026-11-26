import { BadRequestException, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { BridgingModeEnum, ChainEnum } from 'src/common/enum';
import { isSolanaChain } from 'src/utils/chainUtils';
import { getUrlAndApiKey } from 'src/utils/generalUtils';
import { ErrorResponseDto, SolanaTxStatusResponseDto } from './transaction.dto';

const REQUEST_TIMEOUT_MS = 15_000;
// a base58 encoded 64-byte signature
const SIGNATURE_REGEX = /^[1-9A-HJ-NP-Za-km-z]{64,90}$/;
const UINT_REGEX = /^\d+$/;

/**
 * Proxies to cardano-api `GET /api/Solana/GetTxStatus`, which reads through the
 * chain's rate-limited RPC client.
 */
export async function getSolanaTxStatus(
	chainRaw: string,
	signatureRaw: string,
	lastValidBlockHeightRaw: string,
): Promise<SolanaTxStatusResponseDto> {
	const chain = chainRaw?.trim() as ChainEnum;
	const signature = signatureRaw?.trim() ?? '';
	const lastValidBlockHeight = lastValidBlockHeightRaw?.trim() ?? '';

	if (!isSolanaChain(chain)) {
		throw new BadRequestException(`Unsupported Solana chain: ${chainRaw}`);
	}
	if (!SIGNATURE_REGEX.test(signature)) {
		throw new BadRequestException('Query param "signature" is invalid.');
	}
	if (!UINT_REGEX.test(lastValidBlockHeight)) {
		throw new BadRequestException(
			'Query param "lastValidBlockHeight" is invalid.',
		);
	}

	const { url, apiKey } = getUrlAndApiKey(BridgingModeEnum.Skyline, false);
	const endpointUrl =
		`${url.replace(/\/$/, '')}/api/Solana/GetTxStatus` +
		`?chainId=${encodeURIComponent(chain)}` +
		`&signature=${encodeURIComponent(signature)}` +
		`&lastValidBlockHeight=${encodeURIComponent(lastValidBlockHeight)}`;

	Logger.debug(`axios.get: ${endpointUrl}`);

	try {
		const response = await axios.get<SolanaTxStatusResponseDto>(endpointUrl, {
			headers: { 'X-API-KEY': apiKey, Accept: 'application/json' },
			timeout: REQUEST_TIMEOUT_MS,
		});

		Logger.debug(`axios.response: ${JSON.stringify(response.data)}`);

		return response.data;
	} catch (error) {
		if (error instanceof AxiosError && error.response) {
			throw new BadRequestException(error.response.data as ErrorResponseDto);
		}

		throw new BadRequestException(
			error instanceof Error
				? error.message
				: 'Failed to fetch Solana transaction status',
		);
	}
}
