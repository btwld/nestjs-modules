export interface CrudResponsePaginatedInterface<T = unknown> {
  data: T[];
  count: number;
  total: number;
  page: number;
  pageCount: number;
}
