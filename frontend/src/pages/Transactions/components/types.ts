import {
	CreateTransactionDto,
	CreateCardanoTransactionResponseDto,
	CreateEthTransactionFullResponseDto,
	CreateSolanaTransactionFullResponseDto,
} from '../../../swagger/apexBridgeApiService';

export type CreateCardanoTxResponse = {
	createTxDto: CreateTransactionDto;
	createResponse: CreateCardanoTransactionResponseDto;
};

export type CreateEthTxResponse = {
	createTxDto: CreateTransactionDto;
	createResponse: CreateEthTransactionFullResponseDto;
};

export type CreateSolanaTxResponse = {
	createTxDto: CreateTransactionDto;
	createResponse: CreateSolanaTransactionFullResponseDto;
};
