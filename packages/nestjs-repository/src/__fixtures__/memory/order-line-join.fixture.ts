import { type RepositoryColumnMetadataInterface } from '../../repository/interfaces/repository-column-metadata.interface.js';
import { type RepositoryMetadataInterface } from '../../repository/interfaces/repository-metadata.interface.js';

import {
  ORDER_LINE_METADATA,
  type OrderFixture,
  type OrderLineFixture,
} from './order.fixture.js';

const column = (
  name: string,
  flags: Partial<RepositoryColumnMetadataInterface> = {},
): RepositoryColumnMetadataInterface => ({
  name,
  isPrimary: false,
  isVersion: false,
  isRemoveDate: false,
  ...flags,
});

/** An order's columns, as a relation into it reports them. */
const ORDER_COLUMNS = [
  column('id', { isPrimary: true }),
  column('tenantId'),
  column('description'),
  column('dateDeleted', { isRemoveDate: true }),
];

/**
 * A line whose `order` relation pairs `sku` with the order's `tenantId`:
 * each pair names the scope column on one side only.
 */
export class HalfTenantOrderLineEntityFixture implements OrderLineFixture {
  declare id: string;
  declare tenantId: string;
  declare sku: string;
  declare orderId: string;
  declare order?: OrderFixture;
}

export const HALF_TENANT_ORDER_LINE_METADATA: RepositoryMetadataInterface<OrderLineFixture> =
  {
    ...ORDER_LINE_METADATA,
    name: 'HalfTenantOrderLine',
    type: HalfTenantOrderLineEntityFixture,
    urn: 'urn:memory:HalfTenantOrderLine',
    relations: [
      {
        name: 'order',
        targetEntity: 'Order',
        targetUrn: 'urn:memory:Order',
        targetColumns: ORDER_COLUMNS,
        cardinality: 'one',
        on: { from: 'orderId', to: 'id' },
        joinOn: [
          { from: 'orderId', to: 'id' },
          { from: 'sku', to: 'tenantId' },
        ],
        foreignKey: [{ from: 'orderId', to: 'id' }],
      },
    ],
  };

/**
 * A line reaching orders through a junction, on the tenant column too: a
 * many-to-many, whose junction rows the join would read unscoped.
 */
export class LinkedOrderLineEntityFixture implements OrderLineFixture {
  declare id: string;
  declare tenantId: string;
  declare sku: string;
  declare orderId: string;
  declare order?: OrderFixture;
}

export const LINKED_ORDER_LINE_METADATA: RepositoryMetadataInterface<OrderLineFixture> =
  {
    ...ORDER_LINE_METADATA,
    name: 'LinkedOrderLine',
    type: LinkedOrderLineEntityFixture,
    urn: 'urn:memory:LinkedOrderLine',
    relations: [
      {
        name: 'order',
        targetEntity: 'Order',
        targetUrn: 'urn:memory:Order',
        targetColumns: ORDER_COLUMNS,
        cardinality: 'many',
        on: { from: 'id', to: 'id' },
        joinOn: [
          { from: 'tenantId', to: 'tenantId' },
          { from: 'id', to: 'id' },
        ],
        through: {
          urn: 'urn:memory:OrderLink',
          fromKey: 'lineId',
          toKey: 'orderId',
        },
      },
    ],
  };
