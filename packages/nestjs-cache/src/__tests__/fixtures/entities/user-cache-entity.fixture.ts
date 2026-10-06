import { Entity, Unique } from 'typeorm';

import { CacheSqliteEntity } from '../../../infrastructure/persistence/typeorm/cache-sqlite.entity.js';

/**
 * Cache Entity Fixture
 */
@Entity()
@Unique(['key', 'type', 'assigneeId'])
export class UserCacheEntityFixture extends CacheSqliteEntity {}
