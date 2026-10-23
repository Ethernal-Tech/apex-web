import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Largest page size a client may request, so one request can not load a whole table */
export const MAX_PER_PAGE = 100;

/**
 * Largest page index a client may request. Deep offsets are expensive in postgres
 * (all skipped rows are still read), and history UI never goes that far.
 */
export const MAX_PAGE = 10000;

export class PaginatedDto {
	@IsOptional()
	@IsInt()
	@Min(0)
	@Max(MAX_PAGE)
	@ApiProperty({
		description: 'Page number to retrieve',
		nullable: true,
		required: false,
		minimum: 0,
		maximum: MAX_PAGE,
	})
	page?: number;

	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(MAX_PER_PAGE)
	@ApiProperty({
		description: 'Number of items per page',
		nullable: true,
		required: false,
		minimum: 1,
		maximum: MAX_PER_PAGE,
	})
	perPage?: number;
}

export class SortedDto {
	@ApiProperty({ nullable: true, required: false })
	orderBy?: string;

	@ApiProperty({ nullable: true, required: false })
	order?: string;
}
