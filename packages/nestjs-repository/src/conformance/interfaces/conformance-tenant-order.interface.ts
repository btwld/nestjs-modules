import { type ConformanceTenantOrderLineInterface } from './conformance-tenant-order-line.interface.js';

/**
 * An order, unique by `tenantId` and `id` together, so a line's foreign key
 * can name both.
 */
export interface ConformanceTenantOrderInterface {
  id: string;
  tenantId: string;
  total: number;
  lines?: ConformanceTenantOrderLineInterface[];
}
