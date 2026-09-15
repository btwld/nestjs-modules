import { Entity } from 'typeorm';

import { RoleSqliteEntity } from '../../../infrastructure/persistence/typeorm/role-sqlite.entity.js';

/**
 * Role Entity Fixture
 */
@Entity()
export class RoleEntityFixture extends RoleSqliteEntity {}
