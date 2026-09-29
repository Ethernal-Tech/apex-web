import { Module } from '@nestjs/common';
import { TokenInfoController } from './tokenInfo.controller';
import { TokenInfosRegistry } from './tokenInfos.registry';

@Module({
	imports: [],
	providers: [TokenInfosRegistry],
	controllers: [TokenInfoController],
	exports: [TokenInfosRegistry],
})
export class TokenInfoModule {}
