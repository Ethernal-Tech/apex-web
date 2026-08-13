import { Module } from '@nestjs/common';
import { ChainInfoController } from './chainInfo.controller';
import { ChainInfosRegistry } from './chainInfos.registry';

@Module({
	imports: [],
	providers: [ChainInfosRegistry],
	controllers: [ChainInfoController],
	exports: [ChainInfosRegistry],
})
export class ChainInfoModule {}
