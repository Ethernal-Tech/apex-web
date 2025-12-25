import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
	IsArray,
	IsBoolean,
	IsInt,
	IsNotEmpty,
	IsObject,
	IsPositive,
	ValidateNested,
} from 'class-validator';
import { ChainEnum, TxTypeEnum } from 'src/common/enum';

export class BridgingSettingsTokenPairDto {
	@IsNotEmpty()
	@ApiProperty({
		description: 'Source Token ID',
	})
	srcTokenID: number;

	@IsNotEmpty()
	@ApiProperty({
		description: 'Destination Token ID',
	})
	dstTokenID: number;
}

export class BridgingSettingsTokenDto {
	@IsNotEmpty()
	@ApiProperty({
		description:
			'For Cardano policyID.name. For eth, its the erc20 contract address',
	})
	chainSpecific: string;

	@ApiProperty({
		description: 'Specifies the mechanism of bridge handling of this token',
	})
	lockUnlock: boolean;

	@ApiProperty({
		description: 'Specifies if this token is a wrapped currency',
	})
	isWrappedCurrency: boolean;
}

@ApiExtraModels(BridgingSettingsTokenPairDto, BridgingSettingsTokenDto)
export class BridgingSettingsDirectionConfigDto {
	@IsNotEmpty()
	@IsObject()
	@ValidateNested()
	@ApiProperty({
		description: 'Token pairs',
		type: Object,
		additionalProperties: {
			type: 'array',
			items: { $ref: getSchemaPath(BridgingSettingsTokenPairDto) },
		},
	})
	destChain: { [key: string]: BridgingSettingsTokenPairDto[] };

	@IsNotEmpty()
	@IsObject()
	@ValidateNested()
	@ApiProperty({
		description: 'For each tokenID (key), the definition of the token',
		type: Object,
		additionalProperties: {
			$ref: getSchemaPath(BridgingSettingsTokenDto),
		},
	})
	tokens: Record<number, BridgingSettingsTokenDto>;
}

export class BridgingSettingsEcosystemTokenDto {
	@IsNotEmpty()
	@ApiProperty({
		description: 'ID of the token',
	})
	id: number;

	@IsNotEmpty()
	@ApiProperty({
		description: 'Name of the token',
	})
	name: string;
}

@ApiExtraModels(
	BridgingSettingsDirectionConfigDto,
	BridgingSettingsEcosystemTokenDto,
)
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
		description: 'Minimum amount of colored tokens allowed to be bridged',
	})
	minColCoinsAllowedToBridge: number;

	@IsNotEmpty()
	@IsPositive()
	@ApiProperty({
		description: 'Maximum number of receivers allowed in a bridging request',
	})
	maxReceiversPerBridgingRequest: number;

	@IsNotEmpty()
	@IsObject()
	@ValidateNested()
	@ApiProperty({
		description:
			'For each chain, the configuration of tokens and bridging directions',
		type: Object,
		additionalProperties: {
			$ref: getSchemaPath(BridgingSettingsDirectionConfigDto),
		},
	})
	directionConfig: { [key: string]: BridgingSettingsDirectionConfigDto };

	@IsNotEmpty()
	@IsArray()
	@ValidateNested()
	@ApiProperty({
		description: 'Ecosystem tokens',
		isArray: true,
		type: BridgingSettingsEcosystemTokenDto,
	})
	ecosystemTokens: BridgingSettingsEcosystemTokenDto[];
}

export class ReactorOnlyBridgingSettingsDto {
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

@ApiExtraModels(ReactorOnlyBridgingSettingsDto)
export class ReactorOnlySettingsResponseDto {
	@IsNotEmpty()
	@IsObject()
	@ValidateNested()
	@Type(() => ReactorOnlyBridgingSettingsDto)
	@ApiProperty({
		description: 'Settings for bridge',
		type: ReactorOnlyBridgingSettingsDto,
	})
	bridgingSettings: ReactorOnlyBridgingSettingsDto;

	@IsNotEmpty()
	@ApiProperty({
		description: 'Participating chains in the bridge',
	})
	enabledChains: string[];
}

@ApiExtraModels(BridgingSettingsDto)
export class SettingsResponseDto {
	@IsNotEmpty()
	@IsObject()
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

	@IsNotEmpty()
	@IsObject()
	@ValidateNested()
	@ApiProperty({
		description:
			'For each chain, the configuration of tokens and bridging directions',
		type: Object,
		additionalProperties: {
			$ref: getSchemaPath(BridgingSettingsDirectionConfigDto),
		},
	})
	directionConfig: { [key: string]: BridgingSettingsDirectionConfigDto };

	@IsNotEmpty()
	@IsArray()
	@ValidateNested()
	@ApiProperty({
		description: 'Ecosystem tokens',
		isArray: true,
		type: BridgingSettingsEcosystemTokenDto,
	})
	ecosystemTokens: BridgingSettingsEcosystemTokenDto[];
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

export class ValidatorChangeDto {
	@IsNotEmpty()
	@IsBoolean()
	@ApiProperty({
		description:
			'Indicates whether the validator set change is currently in progress.',
	})
	inProgress: boolean;
}
