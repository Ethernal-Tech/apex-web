import {
	CreateTransactionDto,
	CreateCardanoTransactionResponseDto,
	CreateEthTransactionResponseDto,
} from '../../../swagger/apexBridgeApiService';

export type CreateCardanoTxResponse = {
	createTxDto: CreateTransactionDto;
	createResponse: CreateCardanoTransactionResponseDto;
};

export type CreateEthTxResponse = {
	createTxDto: CreateTransactionDto;
	createResponse: CreateEthTransactionResponseDto;
};
