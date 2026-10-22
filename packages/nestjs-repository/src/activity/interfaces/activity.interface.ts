import { type PlainLiteralObject } from '@nestjs/common';

/** The write an activity record describes. */
export type ActivityOperation =
  | 'create'
  | 'update'
  | 'replace'
  | 'upsert'
  | 'delete'
  | 'softDelete'
  | 'restore';

/**
 * One stored row a write altered: the own columns of an activity store.
 *
 * A store entity carries every one of these columns, and may add its own,
 * filled by hooks on the store.
 */
export interface ActivityInterface {
  /** The `forRoot()` key of the entity written. */
  entityKey: string;

  /** The written entity's storage identity, as its driver reports it. */
  urn: string;

  operation: ActivityOperation;

  /** The written row's primary key value, as a string. */
  recordId: string;

  /** The columns the write changed. */
  changed: string[];

  /**
   * The new value of each changed column, less those the registration omits;
   * `null` unless the registration asks for values, and when nothing changed.
   */
  values: PlainLiteralObject | null;

  occurredAt: Date;

  /**
   * The interaction the write belongs to, when the caller's context carries
   * one. Taken as given, never verified.
   */
  correlationId: string | null;
}

/** The columns every activity store must have. */
export const ACTIVITY_COLUMNS: readonly (keyof ActivityInterface)[] = [
  'entityKey',
  'urn',
  'operation',
  'recordId',
  'changed',
  'values',
  'occurredAt',
  'correlationId',
];
