import { type PlainLiteralObject } from '@nestjs/common';

import {
  AppContextHost,
  CorrelationCtx,
  RuntimeException,
} from '@concepta/nestjs-core';

import { ActivityWriteException } from './exceptions/activity-write.exception.js';
import { type ActivityBinding } from './interfaces/activity-binding.interface.js';
import { type ActivityEntity } from './interfaces/activity-entity.interface.js';
import {
  type ActivityInterface,
  type ActivityOperation,
} from './interfaces/activity.interface.js';

/**
 * Records the stored rows a write altered, one record per row, through the
 * store's own repository with the caller's ctx. The records join whatever
 * transaction the caller opened, and the store's hooks, row scope and write
 * policy apply to them.
 */
export class ActivityWriter {
  constructor(
    private readonly entity: ActivityEntity,
    private readonly binding: ActivityBinding,
  ) {}

  /**
   * Record `rows`, the checked rows a write returned, or for the delete
   * family the checked rows it named.
   *
   * `payload` is what an update or upsert handed the driver: the columns it
   * names are the ones that changed.
   */
  async record(
    operation: ActivityOperation,
    rows: readonly PlainLiteralObject[],
    ctx: PlainLiteralObject | undefined,
    payload?: PlainLiteralObject,
  ): Promise<void> {
    if (rows.length === 0) return;

    const occurredAt = new Date();
    const correlationId = this.correlationIdOf(ctx);
    const records: ActivityInterface[] = rows.map((row) => {
      const columns = this.changedColumns(operation, row, payload);
      return {
        entityKey: this.entity.key,
        urn: this.entity.urn,
        operation,
        recordId: String(row[this.binding.primaryColumn]),
        changed: columns,
        values:
          this.binding.values && columns.length
            ? this.pick(
                row,
                columns.filter((column) => !this.binding.omit.has(column)),
              )
            : null,
        occurredAt,
        correlationId,
      };
    });

    try {
      await this.binding.store.createMany(records, { ctx });
    } catch (error) {
      // A store refusal keeps its status and fault, so a scope the caller
      // lacks reads as the refusal it is, not as a server failure.
      throw new ActivityWriteException(
        this.entity.name,
        this.binding.store.metadata.name,
        error instanceof RuntimeException
          ? {
              originalError: error,
              httpStatus: error.httpStatus,
              fault: error.fault,
            }
          : { originalError: error },
      );
    }
  }

  /**
   * The columns a write changed: every own column of a new or replaced row,
   * the columns an update or upsert named less the primary key, the
   * delete-date column of a soft delete or restore, and none for a delete.
   */
  private changedColumns(
    operation: ActivityOperation,
    row: PlainLiteralObject,
    payload: PlainLiteralObject | undefined,
  ): string[] {
    switch (operation) {
      case 'create':
      case 'replace':
        return this.entity.columns.filter(
          (column) => row[column] !== undefined,
        );
      case 'update':
      case 'upsert':
        return Object.keys(payload ?? {}).filter(
          (column) => column !== this.binding.primaryColumn,
        );
      case 'softDelete':
      case 'restore':
        return this.entity.deleteDateColumn
          ? [this.entity.deleteDateColumn]
          : [];
      case 'delete':
        return [];
    }
  }

  private pick(
    row: PlainLiteralObject,
    columns: readonly string[],
  ): PlainLiteralObject {
    return Object.fromEntries(
      columns
        .filter((column) => row[column] !== undefined)
        .map((column) => [column, row[column]]),
    );
  }

  private correlationIdOf(ctx: PlainLiteralObject | undefined): string | null {
    if (!ctx) return null;
    const appCtx = AppContextHost.from(ctx);
    return appCtx.supports(CorrelationCtx)
      ? appCtx.with(CorrelationCtx).correlationId
      : null;
  }
}
