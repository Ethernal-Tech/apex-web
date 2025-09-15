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
import { ChainEnum } from 'src/common/enum';

export class BridgingSettingsDto {
	@IsNotEmpty()
	@IsPositive()
	@ApiProperty({
		description:
			'For each chain, the minimum fee required to cover the submission of the transaction on the destination chain',
		type: Object,
		additionalProperties: { type: 'number' },
	})
	minChainFeeForBridging: { [key: string]: number };

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
}

@ApiExtraModels(NativeTokenDto)
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
export class SettingsFullResponseDto extends SettingsResponseDto {
	@IsNotEmpty()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => LayerZeroChainSettingsDto)
	@ApiProperty({
		description: 'LayerZero chains and their configurations',
		type: () => [LayerZeroChainSettingsDto],
	})
	layerZeroChains: LayerZeroChainSettingsDto[];
}
