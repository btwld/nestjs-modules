import { Test, type TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmRepositoryModule } from '@concepta/nestjs-repository-typeorm';

import { type RoleAssignmentRepositoryResolverInterface } from '../domain/repositories/role-assignment-repository-resolver.interface.js';
import { type RoleRepositoryResolverInterface } from '../domain/repositories/role-repository-resolver.interface.js';
import { type RoleExtrasInterface } from '../infrastructure/config/interfaces/role-extras.interface.js';
import { RoleAssignmentRepository } from '../infrastructure/persistence/role-assignment.repository.js';
import { RoleRepository } from '../infrastructure/persistence/role.repository.js';
import {
  ROLE_ASSIGNMENT_REPOSITORY_RESOLVER_TOKEN,
  ROLE_REPOSITORY_RESOLVER_TOKEN,
} from '../role.constants.js';
import { RoleModule } from '../role.module.js';

import { RoleEntityFixture } from './fixtures/entities/role-entity.fixture.js';
import { UserEntityFixture } from './fixtures/entities/user-entity.fixture.js';
import { UserRoleEntityFixture } from './fixtures/entities/user-role-entity.fixture.js';

describe(RoleModule.name, () => {
  function compile(
    repositories?: RoleExtrasInterface['repositories'],
  ): Promise<TestingModule> {
    return Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          synchronize: true,
          entities: [
            RoleEntityFixture,
            UserRoleEntityFixture,
            UserEntityFixture,
          ],
        }),
        RepositoryModule.forRoot({
          drivers: [
            {
              driver: TypeOrmRepositoryModule,
              entities: [
                { key: 'role', entity: RoleEntityFixture },
                { key: 'userRole', entity: UserRoleEntityFixture },
              ],
            },
          ],
        }),
        RoleModule.forRoot({ repositories }),
        RoleModule.forFeature({
          roleEntityKey: 'role',
          assignmentEntityKeys: ['userRole'],
        }),
      ],
    }).compile();
  }

  describe('forFeature', () => {
    it('should resolve the default repositories', async () => {
      const testModule = await compile();

      expect(
        testModule
          .get<RoleRepositoryResolverInterface>(ROLE_REPOSITORY_RESOLVER_TOKEN)
          .resolve('role'),
      ).toBeInstanceOf(RoleRepository);
      expect(
        testModule
          .get<RoleAssignmentRepositoryResolverInterface>(
            ROLE_ASSIGNMENT_REPOSITORY_RESOLVER_TOKEN,
          )
          .resolve('userRole'),
      ).toBeInstanceOf(RoleAssignmentRepository);
    });

    it('should build repositories.role and repositories.roleAssignment', async () => {
      class CustomRoleRepository extends RoleRepository {}
      class CustomRoleAssignmentRepository extends RoleAssignmentRepository {}

      const testModule = await compile({
        role: CustomRoleRepository,
        roleAssignment: CustomRoleAssignmentRepository,
      });

      expect(
        testModule
          .get<RoleRepositoryResolverInterface>(ROLE_REPOSITORY_RESOLVER_TOKEN)
          .resolve('role'),
      ).toBeInstanceOf(CustomRoleRepository);
      expect(
        testModule
          .get<RoleAssignmentRepositoryResolverInterface>(
            ROLE_ASSIGNMENT_REPOSITORY_RESOLVER_TOKEN,
          )
          .resolve('userRole'),
      ).toBeInstanceOf(CustomRoleAssignmentRepository);
    });
  });
});
