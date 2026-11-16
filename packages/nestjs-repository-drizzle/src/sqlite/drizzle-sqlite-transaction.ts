import { sql } from 'drizzle-orm';

import { RuntimeException } from '@concepta/nestjs-core';
import { type TransactionInterface } from '@concepta/nestjs-repository';

import { gateOf } from './drizzle-sqlite-gate.js';
import { type DrizzleSqliteClient } from './drizzle-sqlite.types.js';
import { rollbackAfter } from './drizzle-sqlite.util.js';

/**
 * A transaction on a Drizzle SQLite database.
 *
 * better-sqlite3 runs a transaction around a synchronous callback, which
 * cannot hold one open across the awaits of a run, so this one issues
 * `BEGIN IMMEDIATE` and `COMMIT` itself. The database has one connection,
 * so the transaction holds the connection's turn until it ends: one
 * transaction at a time, and no statement of anyone else's inside it.
 */
export class DrizzleSqliteTransaction implements TransactionInterface {
  private release?: () => void;

  constructor(private readonly db: DrizzleSqliteClient) {}

  get isActive(): boolean {
    return this.release !== undefined;
  }

  /** The transaction's database, for every read and write in it. */
  getClient(): DrizzleSqliteClient {
    if (!this.release) {
      throw new RuntimeException({
        message: 'No active transaction - cannot get client',
        fault: 'internal',
      });
    }
    return this.db;
  }

  async start(): Promise<void> {
    const release = await gateOf(this.db).acquire();
    try {
      this.db.run(sql`begin immediate`);
    } catch (error) {
      release();
      throw error;
    }
    this.release = release;
  }

  async commit(): Promise<void> {
    const release = this.release;
    if (!release) {
      throw new RuntimeException({
        message: 'No active transaction to commit',
        fault: 'internal',
      });
    }
    try {
      this.db.run(sql`commit`);
    } catch (error) {
      // A commit SQLite refuses leaves the transaction open: end it.
      rollbackAfter(this.db, error);
    } finally {
      this.release = undefined;
      release();
    }
  }

  /**
   * Roll back the transaction. Safe to call when none is active.
   */
  async rollback(): Promise<void> {
    const release = this.release;
    if (!release) return;
    try {
      this.db.run(sql`rollback`);
    } finally {
      this.release = undefined;
      release();
    }
  }
}
