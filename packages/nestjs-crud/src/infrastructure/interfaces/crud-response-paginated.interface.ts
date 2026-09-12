import { type CrudResponseMetrics } from './crud-response-metrics.interface.js';

export interface CrudResponsePaginatedInterface<T = unknown> {
  data: T[];
  limit: number;
  count: number;
  total: number;
  page: number;
  pageCount: number;
  metrics?: CrudResponseMetrics;
}
