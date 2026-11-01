import { type DataSource, type QueryRunner, type EntityManager } from 'typeorm';

import { Logger } from '@nestjs/common';

import { RuntimeException } from '@concepta/nestjs-core';
import { type TransactionInterface } from '@concepta/nestjs-repository';

/**
 * TypeORM implementation of a transaction, shared by every database's
 * adapter.
 *
 * Wraps a TypeORM QueryRunner to manage transaction lifecycle. Each instance
 * represents a single transaction that can be started, committed, or rolled back.
 *
 * @example
 * ```typescript
 * const tx = new TypeOrmPostgresTransaction(dataSource);
 * await tx.start();
 *
 * const manager = tx.getClient();
 * await manager.save(entity);
 *
 * await tx.commit();
 * ```
 */
export abstract class TypeOrmTransaction implements TransactionInterface {
  private queryRunner: QueryRunner | null = null;

  /**
   * @param dataSource - The data source to run on
   */
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Runs once the transaction has begun, before it is handed out. A failure
   * rolls the transaction back and fails `start()`.
   */
  protected async afterBegin(_queryRunner: QueryRunner): Promise<void> {}

  /**
   * Whether the transaction is currently active.
   */
  get isActive(): boolean {
    return this.queryRunner?.isTransactionActive ?? false;
  }

  /**
   * Start the transaction by creating a QueryRunner, beginning a
   * transaction and running `afterBegin`.
   *
   * `this.queryRunner` is only assigned once every step succeeds. A failure
   * still leaves a real, connected QueryRunner behind — it's released here
   * rather than left to leak a pool connection, since nothing else holds a
   * reference to it. An open transaction is rolled back first, so the
   * connection goes back to the pool with nothing open on it.
   */
  async start(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await this.afterBegin(queryRunner);
    } catch (error) {
      await this.abandon(queryRunner);
      throw error;
    }

    this.queryRunner = queryRunner;
  }

  /**
   * Commit the transaction and release the QueryRunner.
   */
  async commit(): Promise<void> {
    if (!this.queryRunner) {
      throw new RuntimeException({
        message: 'No active transaction to commit',
        fault: 'internal',
      });
    }

    try {
      await this.queryRunner.commitTransaction();
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Rollback the transaction and release the QueryRunner.
   * Safe to call even if no transaction is active.
   */
  async rollback(): Promise<void> {
    if (!this.queryRunner) {
      return;
    }

    try {
      if (this.queryRunner.isTransactionActive) {
        await this.queryRunner.rollbackTransaction();
      }
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Get the EntityManager for this transaction.
   */
  getClient(): EntityManager {
    if (!this.queryRunner?.manager) {
      throw new RuntimeException({
        message: 'No active transaction - cannot get client',
        fault: 'internal',
      });
    }
    return this.queryRunner.manager;
  }

  // Rolls back whenever the QueryRunner reports a transaction, even if
  // startTransaction() rejected: it can reject after BEGIN succeeded (a
  // failing isolation-level statement or `afterTransactionStart`
  // subscriber), and releasing that connection would hand its open
  // transaction to the next request.
  private async abandon(queryRunner: QueryRunner): Promise<void> {
    if (queryRunner.isTransactionActive) {
      try {
        await queryRunner.rollbackTransaction();
      } catch (rollbackError) {
        Logger.error(
          `Failed to roll back QueryRunner after start() failed: ${rollbackError}`,
          rollbackError instanceof Error ? rollbackError.stack : undefined,
        );
      }
    }

    try {
      await queryRunner.release();
    } catch (releaseError) {
      Logger.error(
        `Failed to release QueryRunner after start() failed: ${releaseError}`,
        releaseError instanceof Error ? releaseError.stack : undefined,
      );
    }
  }

  private async cleanup(): Promise<void> {
    if (this.queryRunner) {
      await this.queryRunner.release();
      this.queryRunner = null;
    }
  }
}
