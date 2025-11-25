import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
	IsArray,
	IsInt,
	IsNotEmpty,
	IsObject,
	IsPositive,
	ValidateNested,
} from 'class-validator';
import { ChainEnum, TokenEnum, TxTypeEnum } from 'src/common/enum';

export class BridgingSettingsDto {
	@IsNotEmpty()
	@IsPositive()
	@ApiProperty({
		description:
			'For each chain, the minimum fee required to cover the submission of the currency transaction on the destination chain',
		type: Object,
		additionalProperties: { type: 'number' },
	})
	minChainFeeForBridging: { [key: string]: number };

	@IsNotEmpty()
	@IsPositive()
	@ApiProperty({
		description:
			'For each chain, the minimum fee required to cover the submission of the native token transaction on the destination chain',
		type: Object,
		additionalProperties: { type: 'number' },
	})
	minChainFeeForBridgingTokens: { [key: string]: number };

	@IsNotEmpty()
	@IsPositive()
	@ApiProperty({
		description:
			'For each chain, the minimum fee required to cover operational costs',
		type: Object,
		additionalProperties: { type: 'number' },
	})
	minOperationFee: { [key: string]: number };

	@IsNotEmpty()
	@IsPositive()
	@ApiProperty({
		description: 'For each chain, the minimum allowed UTXO value',
		type: Object,
		additionalProperties: { type: 'number' },
	})
	minUtxoChainValue: { [key: string]: number };

	@IsNotEmpty()
	@IsPositive()
	@ApiProperty({
		description: 'Minimum value allowed to be bridged',
	})
	minValueToBridge: number;

	@IsNotEmpty()
	@ApiProperty({
		description: 'Maximum amount of currency allowed to be bridged',
	})
	maxAmountAllowedToBridge: string;

	@IsNotEmpty()
	@ApiProperty({
		description: 'Maximum amount of native tokens allowed to be bridged',
	})
	maxTokenAmountAllowedToBridge: string;

	@IsNotEmpty()
	@IsPositive()
	@ApiProperty({
		description: 'Maximum number of receivers allowed in a bridging request',
	})
	maxReceiversPerBridgingRequest: number;

	@IsNotEmpty()
	@ApiProperty({
		type: Object,
		additionalProperties: {
			type: 'array',
			items: { type: 'string' },
		},
	})
	allowedDirections: { [key: string]: string[] };
}

export class NativeTokenDto {
	@IsNotEmpty()
	@ApiProperty({
		description: 'Destination chain ID',
	})
	dstChainID: string;

	@IsNotEmpty()
	@ApiProperty({
		description: 'Native token name',
	})
	tokenName: string;

	@ApiProperty({
		description: 'Native token identifier',
		enum: TokenEnum,
		enumName: 'TokenEnum',
	})
	token: TokenEnum;
}

export class LayerZeroChainSettingsDto {
	@IsNotEmpty()
	@ApiProperty({
		description: 'Chain name',
		enum: ChainEnum,
	})
	chain: ChainEnum;

	@IsNotEmpty()
	@ApiProperty({
		description: 'Layer Zero OFT smart contract address',
		example: '0x1234567890abcdef1234567890abcdef12345678',
	})
	oftAddress: string;

	@IsNotEmpty()
	@IsInt()
	@IsPositive()
	@ApiProperty({
		description: 'EVM chain ID',
		example: 43114, // Avalanche example
	})
	chainID: number;

	@IsNotEmpty()
	@ApiProperty({
		description: 'Tx type',
		enum: TxTypeEnum,
		enumName: 'TxTypeEnum',
	})
	txType: TxTypeEnum;
}

@ApiExtraModels(NativeTokenDto, BridgingSettingsDto)
export class SettingsResponseDto {
	@IsNotEmpty()
	@ApiProperty({
		description: 'Specifies the current operating mode of the application',
	})
	runMode: string;

	@IsNotEmpty()
	@IsObject()
	@ApiProperty({
		description:
			'For each source chain, defines the native token that will be received on the destination chain',
		type: Object,
		additionalProperties: {
			type: 'array',
			items: { $ref: getSchemaPath(NativeTokenDto) },
		},
	})
	cardanoChainsNativeTokens: {
		[key: string]: NativeTokenDto[];
	};

	@IsNotEmpty()
	@ValidateNested()
	@Type(() => BridgingSettingsDto)
	@ApiProperty({
		description: 'Settings for bridge',
		type: BridgingSettingsDto,
	})
	bridgingSettings: BridgingSettingsDto;

	@IsNotEmpty()
	@ApiProperty({
		description: 'Participating chains in the bridge',
	})
	enabledChains: string[];
}

@ApiExtraModels(SettingsResponseDto, LayerZeroChainSettingsDto)
export class SettingsFullResponseDto {
	@IsNotEmpty()
	@ApiProperty({
		description: 'Settings per bridging mode (reactor, skyline)',
		type: 'object',
		additionalProperties: { $ref: getSchemaPath(SettingsResponseDto) },
	})
	settingsPerMode: { [key: string]: SettingsResponseDto };

	@IsNotEmpty()
	@ApiProperty({
		description: 'All allowed directions',
		type: 'object',
		additionalProperties: {
			type: 'array',
			items: { type: 'string' },
		},
	})
	allowedDirections: { [key: string]: string[] };

	@IsNotEmpty()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => LayerZeroChainSettingsDto)
	@ApiProperty({
		description: 'LayerZero chains and their configurations',
		type: () => [LayerZeroChainSettingsDto],
	})
	layerZeroChains: LayerZeroChainSettingsDto[];

	@IsNotEmpty()
	@ApiProperty({
		description: 'Participating chains in the bridge',
	})
	enabledChains: string[];
}

export class AllBridgingAddressesDto {
	@IsNotEmpty()
	@IsArray()
	@ValidateNested({ each: true })
	@ApiProperty({
		description: 'Bridging address',
	})
	addresses: string[];
}
