import { Entity } from 'typeorm';

import { RoleAssignmentSqliteEntity } from '../../../infrastructure/persistence/typeorm/role-assignment-sqlite.entity.js';

/**
 * Api Key Role Entity Fixture
 */
@Entity()
export class ApiKeyRoleEntityFixture extends RoleAssignmentSqliteEntity {}
