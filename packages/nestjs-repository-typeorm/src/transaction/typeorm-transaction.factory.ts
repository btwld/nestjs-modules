import { DataSource } from 'typeorm';

import { Injectable } from '@nestjs/common';

import {
  TransactionInterface,
  TransactionFactoryInterface,
} from '@concepta/nestjs-repository';

import { TypeOrmTransaction } from './typeorm-transaction.js';

/**
 * Factory for creating TypeORM transactions.
 *
 * Registered with the TransactionFactoryRegistry to enable automatic
 * transaction management via the `@Transactional()` decorator.
 */
@Injectable()
export class TypeOrmTransactionFactory implements TransactionFactoryInterface {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Create a new transaction instance bound to this factory's DataSource.
   */
  create(): TransactionInterface {
    return new TypeOrmTransaction(this.dataSource);
  }
}
