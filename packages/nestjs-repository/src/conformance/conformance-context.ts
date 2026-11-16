import { type INestApplicationContext } from '@nestjs/common';

import { type RepositoryInterface } from '../repository/interfaces/repository.interface.js';
import { TransactionScope } from '../transaction/transaction-scope.js';
import { getDynamicRepositoryToken } from '../utils/get-dynamic-repository-token.js';

import { type ConformanceCapabilitiesInterface } from './interfaces/conformance-capabilities.interface.js';
import { type ConformanceContextOptionsInterface } from './interfaces/conformance-context-options.interface.js';
import { type ConformanceFixturesInterface } from './interfaces/conformance-fixtures.interface.js';
import { type ConformanceTestApiInterface } from './interfaces/conformance-test-api.interface.js';

/**
 * What every conformance section works with: the test API, the harness, and
 * the application built from it, one per harness and shared by every case.
 */
export class ConformanceContext {
  private current?: INestApplicationContext;

  constructor(
    private readonly options: ConformanceContextOptionsInterface,
    readonly test: ConformanceTestApiInterface,
  ) {}

  get name(): string {
    return this.options.name;
  }

  get capabilities(): ConformanceCapabilitiesInterface {
    return this.options.capabilities;
  }

  get fixtures(): ConformanceContextOptionsInterface['fixtures'] {
    return this.options.fixtures;
  }

  async start(): Promise<void> {
    this.current = await this.options.createApp();
  }

  async stop(): Promise<void> {
    await this.current?.close();
    this.current = undefined;
  }

  get app(): INestApplicationContext {
    if (!this.current) {
      throw new Error(
        `The conformance application for "${this.name}" is not running`,
      );
    }
    return this.current;
  }

  /** The repository registered for a fixture key. */
  repo<Key extends keyof ConformanceFixturesInterface>(
    key: Key,
  ): RepositoryInterface<ConformanceFixturesInterface[Key]> {
    return this.app.get<RepositoryInterface<ConformanceFixturesInterface[Key]>>(
      getDynamicRepositoryToken(this.fixtures[key].key),
    );
  }

  get transactionScope(): TransactionScope {
    return this.app.get(TransactionScope);
  }

  async reset(): Promise<void> {
    await this.options.reset(this.app);
  }

  async linkBookTag(bookId: string, tagId: string): Promise<void> {
    if (!this.options.linkBookTag) {
      throw new Error(
        `The conformance harness "${this.name}" supports relations, so it ` +
          `needs linkBookTag`,
      );
    }
    await this.options.linkBookTag(this.app, { bookId, tagId });
  }
}
