import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsPositive } from "class-validator";

export class LockedTokensDto {
    @IsNotEmpty()
    @IsPositive()
    @ApiProperty({
        description:
            'For each chain, the number of locked tokens',
        type: Object,
        additionalProperties: { type: 'number' },
    })
    chains: { [key: string]: { [innerKey: string]: number } } ;
}