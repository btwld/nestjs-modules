import { Entity } from 'typeorm';

import { RoleAssignmentSqliteEntity } from '../../../infrastructure/persistence/typeorm/role-assignment-sqlite.entity.js';

/**
 * User Role Entity Fixture
 */
@Entity()
export class UserRoleEntityFixture extends RoleAssignmentSqliteEntity {}
