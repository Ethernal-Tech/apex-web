import {
	CreateTransactionDto,
	CreateCardanoTransactionResponseDto,
	CreateEthTransactionFullResponseDto,
} from '../../../swagger/apexBridgeApiService';

export type CreateCardanoTxResponse = {
	createTxDto: CreateTransactionDto;
	createResponse: CreateCardanoTransactionResponseDto;
};

export type CreateEthTxResponse = {
	createTxDto: CreateTransactionDto;
	createResponse: CreateEthTransactionFullResponseDto;
};
