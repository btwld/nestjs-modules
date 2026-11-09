import { type PlainLiteralObject } from '@nestjs/common';

/**
 * Creates a standard paginated response matching the service's expected format.
 * Uses sensible defaults - only specify limit when testing buffer behavior.
 */
export const createPaginatedResponse = <T extends PlainLiteralObject>(
  data: T[],
  options: {
    limit?: number;
    page?: number;
    total?: number;
  } = {},
) => {
  const limit = options.limit ?? 10;
  const page = options.page ?? 1;
  const total = options.total ?? data.length;
  const pageCount = Math.ceil(total / limit);

  return {
    data,
    count: data.length,
    total,
    limit,
    page,
    pageCount,
  };
};
