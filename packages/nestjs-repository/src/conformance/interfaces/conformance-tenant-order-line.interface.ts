import { type ConformanceTenantOrderInterface } from './conformance-tenant-order.interface.js';

/**
 * An order line whose foreign key to its order is `(tenantId, orderId)`, so
 * a join to the order matches the tenant as well as the id.
 */
export interface ConformanceTenantOrderLineInterface {
  id: string;
  tenantId: string;
  orderId: string;
  qty: number;
  order?: ConformanceTenantOrderInterface | null;
}
