import { ApiProperty } from '@nestjs/swagger';

export class PaginatedDto {
	@ApiProperty({ nullable: true, required: false })
	page?: number;

	@ApiProperty({ nullable: true, required: false })
	perPage?: number;
}

export class SortedDto {
	@ApiProperty({ nullable: true, required: false })
	orderBy?: string;

	@ApiProperty({ nullable: true, required: false })
	order?: string;
}
