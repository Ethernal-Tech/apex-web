import { CreateTransactionDto, CreateTransactionResponseDto } from "../../../swagger/apexBridgeApiService"

export type CreateTxResponse = {
    createTxDto: CreateTransactionDto
    createResponse: CreateTransactionResponseDto
}