import { Module } from '@nestjs/common';
import { SolanaRpcController } from './solanaRpc.controller';
import { SolanaRpcService } from './solanaRpc.service';

@Module({
	providers: [SolanaRpcService],
	controllers: [SolanaRpcController],
})
export class SolanaRpcModule {}
