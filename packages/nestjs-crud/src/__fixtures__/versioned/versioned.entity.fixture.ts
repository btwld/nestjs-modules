import { Column, Entity } from 'typeorm';

import { CommonSqliteEntity } from '@concepta/nestjs-repository-typeorm';

import { type VersionedEntityInterfaceFixture } from './interfaces/versioned-entity.interface.fixture.js';

/**
 * A dedicated entity with both a version column and a delete column behind
 * real CRUD routes, for the #472 (optimistic locking / `If-Match`) e2e
 * tests. Deliberately not the `photo` fixture: `photoSchema` doubles as
 * `photo-body-fallback`'s controller-level request body
 * (`packages/nestjs-crud/src/__fixtures__/app-photo-body-fallback.module.fixture.ts`),
 * so adding a required `version` field there would make it a mandatory
 * POST field and break that fixture's own tests.
 */
@Entity()
export class VersionedFixture
  extends CommonSqliteEntity
  implements VersionedEntityInterfaceFixture
{
  @Column()
  name!: string;
}
