import { type QueryRunner } from 'typeorm';

import { TypeOrmTransaction } from '../transaction/typeorm-transaction.js';

import { gateOf } from './typeorm-sqlite-gate.js';

/**
 * A transaction on a SQLite data source. The data source has one
 * connection, which every query runner shares, so the transaction holds
 * the connection's turn from `BEGIN` until it ends: no statement of anyone
 * else's runs inside it.
 */
export class TypeOrmSqliteTransaction extends TypeOrmTransaction {
  private endTurn?: () => void;

  /**
   * Whether the transaction holds the connection's turn. The query runner's
   * own flag is shared by every transaction on the data source.
   */
  override get isActive(): boolean {
    return this.endTurn !== undefined;
  }

  override async start(): Promise<void> {
    this.endTurn = await gateOf(this.dataSource).acquire();
    try {
      await super.start();
    } catch (error) {
      this.releaseTurn();
      throw error;
    }
  }

  protected override async release(queryRunner: QueryRunner): Promise<void> {
    try {
      await super.release(queryRunner);
    } finally {
      this.releaseTurn();
    }
  }

  private releaseTurn(): void {
    const endTurn = this.endTurn;
    this.endTurn = undefined;
    endTurn?.();
  }
}
