import { Module } from "@nestjs/common";
import { LockedTokensService } from "./lockedTokens.service";
import { LockedTokensController } from "./lockedTokens.controller";


const providers = [
    {
        provide: LockedTokensService,
        useFactory: async (): Promise<LockedTokensService> => {
            const s = new LockedTokensService();
            await s.init();
            return s;
        },
    },
];

@Module({
    imports: [],
    providers: providers,
    controllers: [LockedTokensController],
})
export class LockedTokensModule {}