import { Injectable } from '@nestjs/common';

import { RepositoryDuplicateUrnException } from '../exceptions/repository-duplicate-urn.exception.js';
import { RepositoryRegistryItem } from '../interfaces/repository-registry-item.interface.js';

export { RepositoryRegistryItem };

export const REPOSITORY_REGISTRY = Symbol('RepositoryRegistry');

/**
 * Registry of every repository `RepositoryModule.forRoot()` registered.
 *
 * Filled once, when the module is compiled. Refuses two registrations reading
 * the same rows (the same URN).
 */
@Injectable()
export class RepositoryRegistryService {
  private readonly urnIndex = new Map<
    string,
    Readonly<RepositoryRegistryItem>
  >();

  /**
   * Look up the repository reading the rows `urn` names.
   */
  getByUrn(urn: string): Readonly<RepositoryRegistryItem> | undefined {
    return this.urnIndex.get(urn);
  }

  /**
   * Every repository whose entity is named `name`. Names are not unique, so
   * a caller needing one decides what more than one means.
   */
  getByEntityName(name: string): Readonly<RepositoryRegistryItem>[] {
    return [...this.urnIndex.values()].filter(
      (item) => item.entityName === name,
    );
  }

  /**
   * Register every repository at once. Keys are already distinct.
   *
   * Throws if two registrations read the same rows.
   */
  register(items: RepositoryRegistryItem[]): void {
    const duplicateUrns: {
      urn: string;
      existing: string;
      attempted: string;
    }[] = [];

    for (const item of items.map((entry) => Object.freeze({ ...entry }))) {
      const sameRows = this.urnIndex.get(item.urn);
      if (sameRows) {
        duplicateUrns.push({
          urn: item.urn,
          existing: sameRows.key,
          attempted: item.key,
        });
      } else {
        this.urnIndex.set(item.urn, item);
      }
    }

    if (duplicateUrns.length > 0) {
      throw new RepositoryDuplicateUrnException(duplicateUrns);
    }
  }
}
