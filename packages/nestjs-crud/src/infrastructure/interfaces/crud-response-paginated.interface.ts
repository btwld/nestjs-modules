export interface CrudResponsePaginatedInterface<T = unknown> {
  data: T[];
  limit: number;
  count: number;
  total: number;
  page: number;
  pageCount: number;
}
