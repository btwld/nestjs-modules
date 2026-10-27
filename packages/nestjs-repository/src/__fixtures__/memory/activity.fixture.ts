import { type PlainLiteralObject } from '@nestjs/common';

import { type ActivityInterface } from '../../activity/interfaces/activity.interface.js';
import { type RepositoryColumnMetadataInterface } from '../../repository/interfaces/repository-column-metadata.interface.js';
import { type RepositoryMetadataInterface } from '../../repository/interfaces/repository-metadata.interface.js';

export const WIDGET_TOKEN = 'widgets';
export const ACTIVITY_TOKEN = 'activities';
export const TENANT_ACTIVITY_TOKEN = 'tenant-activities';
export const PAIR_TOKEN = 'pairs';

/** A widget: unscoped, soft deleted, the entity whose writes are recorded. */
export interface WidgetFixture {
  id: string;
  name: string;
  color?: string | null;
  secret?: string | null;
  dateDeleted?: Date | null;
}

export class WidgetEntityFixture implements WidgetFixture {
  declare id: string;
  declare name: string;
  declare color?: string | null;
  declare secret?: string | null;
  declare dateDeleted?: Date | null;
}

/** An activity store row, with the actor column a store hook fills. */
export interface ActivityFixture extends ActivityInterface {
  id: string;
  actorId?: string | null;
}

export class ActivityEntityFixture implements ActivityFixture {
  declare id: string;
  declare entityKey: string;
  declare urn: string;
  declare operation: ActivityFixture['operation'];
  declare recordId: string;
  declare changed: string[];
  declare values: PlainLiteralObject | null;
  declare occurredAt: Date;
  declare correlationId: string | null;
  declare actorId?: string | null;
}

/** An activity store scoped by tenant. */
export interface TenantActivityFixture extends ActivityFixture {
  tenantId: string;
}

export class TenantActivityEntityFixture
  extends ActivityEntityFixture
  implements TenantActivityFixture
{
  declare tenantId: string;
}

/** A row keyed by two columns, which activity cannot name by one value. */
export interface PairFixture {
  leftId: string;
  rightId: string;
  label: string;
}

export class PairEntityFixture implements PairFixture {
  declare leftId: string;
  declare rightId: string;
  declare label: string;
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

const id = column('id', { isPrimary: true });

const ACTIVITY_COLUMNS = [
  id,
  column('entityKey'),
  column('urn'),
  column('operation'),
  column('recordId'),
  column('changed'),
  column('values'),
  column('occurredAt'),
  column('correlationId'),
  column('actorId'),
];

export const WIDGET_METADATA: RepositoryMetadataInterface<WidgetFixture> = {
  name: 'Widget',
  type: WidgetEntityFixture,
  urn: 'urn:memory:Widget',
  columns: [
    id,
    column('name'),
    column('color'),
    column('secret'),
    column('dateDeleted', { isRemoveDate: true }),
  ],
  relations: [],
};

export const ACTIVITY_METADATA: RepositoryMetadataInterface<ActivityFixture> = {
  name: 'Activity',
  type: ActivityEntityFixture,
  urn: 'urn:memory:Activity',
  columns: ACTIVITY_COLUMNS,
  relations: [],
};

export const TENANT_ACTIVITY_METADATA: RepositoryMetadataInterface<TenantActivityFixture> =
  {
    name: 'TenantActivity',
    type: TenantActivityEntityFixture,
    urn: 'urn:memory:TenantActivity',
    columns: [...ACTIVITY_COLUMNS, column('tenantId')],
    relations: [],
  };

export const PAIR_METADATA: RepositoryMetadataInterface<PairFixture> = {
  name: 'Pair',
  type: PairEntityFixture,
  urn: 'urn:memory:Pair',
  columns: [
    column('leftId', { isPrimary: true }),
    column('rightId', { isPrimary: true }),
    column('label'),
  ],
  relations: [],
};
