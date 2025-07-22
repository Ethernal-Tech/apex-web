import { ApiProperty } from '@nestjs/swagger';

export class PaginatedDto {
	@ApiProperty({
		description: 'Page number to retrieve',
		nullable: true,
		required: false,
	})
	page?: number;

	@ApiProperty({
		description: 'Number of items per page',
		nullable: true,
		required: false,
	})
	perPage?: number;
}

export class SortedDto {
	@ApiProperty({ nullable: true, required: false })
	orderBy?: string;

	@ApiProperty({ nullable: true, required: false })
	order?: string;
}
