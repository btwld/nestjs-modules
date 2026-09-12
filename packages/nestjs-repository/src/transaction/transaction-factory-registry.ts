import { Injectable } from '@nestjs/common';

import { TransactionFactoryInterface } from '../interfaces/transaction-factory.interface.js';

export const TRANSACTION_FACTORY_REGISTRY = Symbol(
  'TransactionFactoryRegistry',
);

/**
 * Registry for transaction factories.
 * Each repository module registers its factory keyed by "driver:datasource".
 */
@Injectable()
export class TransactionFactoryRegistry {
  private readonly factories = new Map<string, TransactionFactoryInterface>();

  register(key: string, factory: TransactionFactoryInterface): void {
    if (!this.factories.has(key)) {
      this.factories.set(key, factory);
    }
  }

  get(key: string): TransactionFactoryInterface | undefined {
    return this.factories.get(key);
  }

  get count(): number {
    return this.factories.size;
  }
}
