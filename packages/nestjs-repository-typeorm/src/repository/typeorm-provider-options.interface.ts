import { type DataSource, type Repository } from 'typeorm';

import { type PlainLiteralObject } from '@nestjs/common';

import { type RepositoryProviderOptions } from '@concepta/nestjs-repository';

import { type TypeOrmDataSourceToken } from '../typeorm-repository.types.js';

/**
 * TypeORM-specific provider options.
 */
export interface TypeOrmProviderOptionsInterface<
  Entity extends PlainLiteralObject = PlainLiteralObject,
> extends RepositoryProviderOptions<Entity> {
  /**
   * Data source name or instance for multi-connection setups.
   */
  dataSource?: TypeOrmDataSourceToken;

  /**
   * Custom repository factory.
   * Receives DataSource, returns Repository instance.
   */
  factory?: (dataSource: DataSource) => Repository<Entity>;
}
