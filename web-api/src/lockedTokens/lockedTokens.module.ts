import { Module } from "@nestjs/common";
import { LockedTokensService } from "./lockedTokens.service";

@Module({
    imports: [],
    providers: [LockedTokensService],
    controllers: [LockedTokensService],
})
export class LockedTokensModule {}