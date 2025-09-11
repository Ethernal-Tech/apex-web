import { ApiProperty } from '@nestjs/swagger';

export class LayerZeroTransferDto {
    @ApiProperty({
        description: 'Source chain name where the OFT transfer originates',
        required: true
    })
    srcChainName: string;

    @ApiProperty({
        description: 'Destination chain name where the OFT will be received',
        required: true
    })
    dstChainName: string;

    @ApiProperty({
        description: 'Address of the OFT contract on the source chain',
        required: true
    })
    oftAddress: string;

    @ApiProperty({
        description: 'Amount to transfer in the smallest unit (wei/satoshi equivalent)',
        required: true
    })
    amount: string;

    @ApiProperty({
        description: 'Address of the sender wallet',
        required: true
    })
    from: string;

    @ApiProperty({
        description: 'Address of the recipient wallet (EVM hex or Solana base58)',
        required: true
    })
    to: string;

    @ApiProperty({
        description: 'Whether to validate balances before creating transaction',
        default: false,
        required: false
    })
    validate: boolean;

    @ApiProperty({
        description: 'Structured LayerZero execution options as JSON string. EXECUTOR OPTIONS: - lzReceive: Set gas limit and optional native drop for lzReceive execution - nativeDrops: Array of native token drops to specific addresses - composeOptions: Array of compose message execution settings with gas and native drop All numeric values for gas limits and native drops should be strings or numbers. Native drop amounts are in wei (e.g., "1000000000000000" = 0.001 ETH).',
        required: false
    })
    options: string;

    @ApiProperty({
        description: 'Compose message for advanced OFT operations (hex encoded)',
        required: false
    })
    composeMsg: string;

    @ApiProperty({
        description: 'OFT command for advanced operations (hex encoded)',
        required: false
    })
    oftCmd: string;
}

export class MetadataPropertiesDto {
    @ApiProperty({
        description: 'Address of the destination OFT contract',
        example: '0x9208d82f121806a34a39bb90733b4c5c54f3993e',
    })
    dstOftAddress: string;

    @ApiProperty({
        description: 'Type of the destination OFT adapter',
        example: 'NATIVE_OFT_ADAPTER',
    })
    dstOftType: string;

    @ApiProperty({
        description: 'Name of the destination chain',
        example: 'base',
    })
    dstChainName: string;

    @ApiProperty({
        description: 'Amount being transferred (in smallest units)',
        example: '1000000000000000',
    })
    amount: string;

    @ApiProperty({
        description: 'Shared decimals used for cross-chain transfer',
        example: 6,
    })
    sharedDecimals: number;

    @ApiProperty({
        description: 'Local decimals of the token on the source chain',
        example: 18,
    })
    localDecimals: number;
}

export class MetadataTimestampsDto {
    @ApiProperty({
        description: 'Timestamp of when the transaction was created',
        example: 1757581472807,
    })
    created: number;
}

export class MetadataDto {
    @ApiProperty({
        description: 'Key properties describing the transfer',
        type: MetadataPropertiesDto,
    })
    properties: MetadataPropertiesDto;

    @ApiProperty({
        description: 'Timestamps related to the transfer lifecycle',
        type: MetadataTimestampsDto,
    })
    timestamps: MetadataTimestampsDto;
}

export class PopulatedTransactionDto {
    @ApiProperty({
        description: 'Raw transaction calldata to be submitted',
        example:
            '0xc7c7f5b30000000000000000000000000000000000000000000000000000000000000080...',
    })
    data: string;

    @ApiProperty({
        description: 'Destination address for the transaction',
        example: '0x9208d82F121806A34a39bB90733b4C5c54F3993e',
    })
    to: string;

    @ApiProperty({
        description: 'Value in wei being sent with the transaction',
        example: '526925647656479822',
    })
    value: string;
}

export class TransactionDataDto {
    @ApiProperty({
        description: 'Populated transaction ready for signing and sending',
        type: PopulatedTransactionDto,
    })
    populatedTransaction: PopulatedTransactionDto;
}

export class LayerZeroTransferResponseDto {
    @ApiProperty({
        description: 'Transaction history on the destination chain',
        example: [],
        isArray: true,
    })
    dstTxHistory: any[];

    @ApiProperty({
        description:
            'Indicates whether the transfer should be simulated before sending',
        example: false,
    })
    shouldSimulate: boolean;

    @ApiProperty({
        description: 'Type of the response object',
        example: 'Transaction',
    })
    type: string;

    @ApiProperty({
        description: 'Timestamp of when this response was created',
        example: 1757581472807,
    })
    created: number;

    @ApiProperty({
        description: 'Name of the destination chain for this transfer',
        example: 'apexfusionnexus',
    })
    dstChainName: string;

    @ApiProperty({
        description: 'Metadata describing the transfer',
        type: MetadataDto,
    })
    metadata: MetadataDto;

    @ApiProperty({
        description: 'Transaction data including populated transaction',
        type: TransactionDataDto,
    })
    transactionData: TransactionDataDto;

    @ApiProperty({
        description: 'Type of transaction being executed',
        example: 'OFT_SEND',
    })
    transactionType: string;
}