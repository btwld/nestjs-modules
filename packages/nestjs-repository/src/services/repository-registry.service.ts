import { Injectable, OnApplicationBootstrap } from '@nestjs/common';

import { RepositoryDuplicateKeyException } from '../exceptions/repository-duplicate-key.exception.js';
import { RepositoryRegistryItem } from '../interfaces/repository-registry-item.interface.js';

export { RepositoryRegistryItem };

export const REPOSITORY_REGISTRY = Symbol('RepositoryRegistry');

/**
 * Registry for tracking repository registrations.
 *
 * Validates for duplicate keys at application bootstrap.
 */
@Injectable()
export class RepositoryRegistryService implements OnApplicationBootstrap {
  private readonly registry = new Map<
    string,
    Readonly<RepositoryRegistryItem>
  >();
  private readonly entityIndex = new Map<
    string,
    Readonly<RepositoryRegistryItem>
  >();
  private readonly pending: Readonly<RepositoryRegistryItem>[] = [];

  /**
   * Queue an item for validation at bootstrap.
   */
  register(item: RepositoryRegistryItem): void {
    this.pending.push(Object.freeze({ ...item }));
  }

  /**
   * Look up a registry item by entity name.
   *
   * Available after application bootstrap.
   */
  getByEntityName(
    entityName: string,
  ): Readonly<RepositoryRegistryItem> | undefined {
    return this.entityIndex.get(entityName);
  }

  /**
   * Validate all pending items at application bootstrap.
   * Throws if duplicate keys are found.
   */
  onApplicationBootstrap(): void {
    const duplicates: { key: string; existing: string; attempted: string }[] =
      [];

    for (const item of this.pending) {
      const existing = this.registry.get(item.key);

      if (existing) {
        duplicates.push({
          key: item.key,
          existing: existing.entityName,
          attempted: item.entityName,
        });
      } else {
        this.registry.set(item.key, item);
        this.entityIndex.set(item.entityName, item);
      }
    }

    // Clear pending after processing
    this.pending.length = 0;

    if (duplicates.length > 0) {
      throw new RepositoryDuplicateKeyException(duplicates);
    }
  }
}
