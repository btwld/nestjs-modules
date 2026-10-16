import { type RepositoryColumnMetadataInterface } from '../../repository/interfaces/repository-column-metadata.interface.js';
import { type RepositoryMetadataInterface } from '../../repository/interfaces/repository-metadata.interface.js';

export const ORDER_TOKEN = 'orders';
export const ORDER_LINE_TOKEN = 'order-lines';

export interface OrderFixture {
  id: string;
  tenantId: string;
  description: string;
  dateDeleted?: Date | null;
}

export class OrderEntityFixture implements OrderFixture {
  declare id: string;
  declare tenantId: string;
  declare description: string;
  declare dateDeleted?: Date | null;
}

export interface OrderLineFixture {
  id: string;
  tenantId: string;
  sku: string;
  orderId: string;
  order?: OrderFixture;
}

export class OrderLineEntityFixture implements OrderLineFixture {
  declare id: string;
  declare tenantId: string;
  declare sku: string;
  declare orderId: string;
  declare order?: OrderFixture;
}

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

const ORDER_COLUMNS = [
  column('id', { isPrimary: true }),
  column('tenantId'),
  column('description'),
  column('dateDeleted', { isRemoveDate: true }),
];

export const ORDER_METADATA: RepositoryMetadataInterface<OrderFixture> = {
  name: 'Order',
  type: OrderEntityFixture,
  urn: 'urn:memory:Order',
  columns: ORDER_COLUMNS,
  relations: [],
};

/** A line belongs to an order through `orderId`, or the `order` relation. */
export const ORDER_LINE_METADATA: RepositoryMetadataInterface<OrderLineFixture> =
  {
    name: 'OrderLine',
    type: OrderLineEntityFixture,
    urn: 'urn:memory:OrderLine',
    columns: [
      column('id', { isPrimary: true }),
      column('tenantId'),
      column('sku'),
      column('orderId'),
    ],
    relations: [
      {
        name: 'order',
        targetEntity: 'Order',
        targetUrn: 'urn:memory:Order',
        targetColumns: ORDER_COLUMNS,
        cardinality: 'one',
        on: { from: 'orderId', to: 'id' },
        foreignKey: [{ from: 'orderId', to: 'id' }],
      },
    ],
  };
