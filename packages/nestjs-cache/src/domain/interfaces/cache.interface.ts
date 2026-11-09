import { type AssigneeRelationInterface } from '@concepta/nestjs-core';

export interface CacheInterface extends AssigneeRelationInterface {
  /**
   * key to be used as reference for the cache data
   */
  key: string;

  /**
   * Type of the cache
   */
  type: string;

  /**
   * data of the cache
   */
  data: string | null;

  /**
   * Date it will expire
   */
  expirationDate: Date | null;
}
