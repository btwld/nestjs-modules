/**
 * Item stored in the repository registry.
 */
export interface RepositoryRegistryItem {
  /**
   * String key used as injection token.
   */
  readonly key: string;

  /**
   * Entity class name.
   */
  readonly entityName: string;

  /**
   * Module class name that registered this item (e.g., 'TypeOrmRepositoryModule').
   */
  readonly moduleName: string;
}
