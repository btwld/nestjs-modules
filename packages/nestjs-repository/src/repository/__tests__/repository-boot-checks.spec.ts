import {
  type DynamicModule,
  Module,
  type PlainLiteralObject,
  type Type,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { targetColumnsFixture } from '../../__fixtures__/column-metadata.fixture.js';
import { MemoryRepositoryFixture } from '../../__fixtures__/memory/memory-repository.fixture.js';
import { RepositoryBootException } from '../../exceptions/repository-boot.exception.js';
import { RepositoryModule } from '../../repository.module.js';
import { getDynamicRepositoryToken } from '../../utils/get-dynamic-repository-token.js';
import { type RepositoryColumnMetadataInterface } from '../interfaces/repository-column-metadata.interface.js';
import { type RepositoryRelationMetadataInterface } from '../interfaces/repository-relation-metadata.interface.js';
import {
  checkColumnsAreNotRelations,
  checkForeignKeyColumns,
  checkNoAccessorKeys,
} from '../repository-boot-checks.js';

/** Lowercases its keys on assignment, so the driver writes another value. */
class AccountEntity {
  [key: string]: unknown;
  private stored = '';
  private owner = '';

  get email(): string {
    return this.stored;
  }
  set email(value: string) {
    this.stored = value.toLowerCase();
  }

  get ownerId(): string {
    return this.owner;
  }
  set ownerId(value: string) {
    this.owner = value.toLowerCase();
  }
}

class SubAccountEntity extends AccountEntity {}

class PlainAccountEntity {
  [key: string]: unknown;
  email = '';
  ownerId = '';
}

const owner = (from: string): RepositoryRelationMetadataInterface => ({
  name: 'owner',
  targetEntity: 'User',
  targetUrn: 'urn:memory:User',
  targetColumns: targetColumnsFixture('id'),
  cardinality: 'one',
  on: { from, to: 'id' },
  foreignKey: [{ from, to: 'id' }],
});

/** The first column is the primary key. */
const adapterFor = (
  type: Type<PlainLiteralObject>,
  columns: string[],
  relations: RepositoryRelationMetadataInterface[] = [],
) =>
  new MemoryRepositoryFixture('accounts', {
    name: type.name,
    type,
    urn: `urn:memory:${type.name}`,
    columns: columns.map((name, index): RepositoryColumnMetadataInterface => ({
      name,
      isPrimary: index === 0,
      isVersion: false,
      isRemoveDate: false,
    })),
    relations,
  });

describe(checkNoAccessorKeys, () => {
  it('refuses a primary key backed by a getter or setter', () => {
    expect(
      checkNoAccessorKeys([adapterFor(AccountEntity, ['email', 'name'])]),
    ).toEqual([
      '"accounts" key column "email" is a getter or setter on ' +
        'AccountEntity. Keys are read and written as plain properties; ' +
        'make "email" one.',
    ]);
  });

  it('refuses a foreign key backed by a getter or setter', () => {
    expect(
      checkNoAccessorKeys([
        adapterFor(AccountEntity, ['id', 'ownerId'], [owner('ownerId')]),
      ]),
    ).toEqual([expect.stringContaining('key column "ownerId"')]);
  });

  it('refuses an accessor key inherited from a base class', () => {
    expect(
      checkNoAccessorKeys([adapterFor(SubAccountEntity, ['email'])]),
    ).toHaveLength(1);
  });

  it('allows an accessor on a column that is not a key', () => {
    expect(
      checkNoAccessorKeys([adapterFor(AccountEntity, ['id', 'email'])]),
    ).toEqual([]);
  });

  it('allows keys that are plain properties', () => {
    expect(
      checkNoAccessorKeys([
        adapterFor(
          PlainAccountEntity,
          ['email', 'ownerId'],
          [owner('ownerId')],
        ),
      ]),
    ).toEqual([]);
  });
});

describe(checkForeignKeyColumns, () => {
  it('allows a foreign key with a column of its own', () => {
    expect(
      checkForeignKeyColumns([
        adapterFor(PlainAccountEntity, ['id', 'ownerId'], [owner('ownerId')]),
      ]),
    ).toEqual([]);
  });

  it('refuses a foreign key held only by its relation property', () => {
    expect(
      checkForeignKeyColumns([
        adapterFor(PlainAccountEntity, ['id'], [owner('owner')]),
      ]),
    ).toEqual([
      '"accounts" relation "owner" has no column of its own for its foreign ' +
        'key, so it can never be written. Declare the foreign key as a column.',
    ]);
  });

  it('refuses a composite foreign key missing one of its columns', () => {
    const composite: RepositoryRelationMetadataInterface = {
      ...owner('ownerId'),
      foreignKey: [
        { from: 'ownerId', to: 'id' },
        { from: 'ownerRegion', to: 'region' },
      ],
    };

    expect(
      checkForeignKeyColumns([
        adapterFor(PlainAccountEntity, ['id', 'ownerId'], [composite]),
      ]),
    ).toHaveLength(1);
  });

  it('allows relations with no foreign key on this side', () => {
    expect(
      checkForeignKeyColumns([
        adapterFor(
          PlainAccountEntity,
          ['id'],
          [
            {
              name: 'posts',
              targetEntity: 'Post',
              targetUrn: 'urn:memory:Post',
              targetColumns: targetColumnsFixture('id', 'accountId'),
              cardinality: 'many',
              on: { from: 'id', to: 'accountId' },
            },
            {
              name: 'profile',
              targetEntity: 'Profile',
              targetUrn: 'urn:memory:Profile',
              targetColumns: targetColumnsFixture('id', 'accountId'),
              cardinality: 'one',
              on: { from: 'id', to: 'accountId' },
            },
          ],
        ),
      ]),
    ).toEqual([]);
  });

  it('refuses a foreign key naming no column at all', () => {
    expect(
      checkForeignKeyColumns([
        adapterFor(PlainAccountEntity, ['id'], [owner('ownerId')]),
      ]),
    ).toHaveLength(1);
  });
});

describe(checkColumnsAreNotRelations, () => {
  it('refuses a column carrying a relation name', () => {
    expect(
      checkColumnsAreNotRelations([
        adapterFor(PlainAccountEntity, ['id', 'owner'], [owner('owner')]),
      ]),
    ).toEqual([
      '"accounts" relation "owner" is also reported as a column. The ' +
        'repository driver must report a relation only as a relation.',
    ]);
  });

  it('allows a relation whose foreign key column has a name of its own', () => {
    expect(
      checkColumnsAreNotRelations([
        adapterFor(PlainAccountEntity, ['id', 'ownerId'], [owner('ownerId')]),
      ]),
    ).toEqual([]);
  });
});

describe('repository startup checks', () => {
  it.each([
    [
      'an accessor-backed primary key',
      () => adapterFor(AccountEntity, ['email']),
    ],
    [
      'a foreign key without a column',
      () => adapterFor(PlainAccountEntity, ['id'], [owner('owner')]),
    ],
    [
      'a column carrying a relation name',
      () =>
        adapterFor(
          PlainAccountEntity,
          ['id', 'ownerId', 'owner'],
          [owner('ownerId')],
        ),
    ],
  ])('refuse to start with %s', async (_case, adapter) => {
    @Module({})
    class AccountsDriver {
      static register(): DynamicModule {
        return {
          module: AccountsDriver,
          providers: [
            {
              provide: getDynamicRepositoryToken('accounts'),
              useFactory: adapter,
            },
          ],
        };
      }
    }

    await expect(
      Test.createTestingModule({
        imports: [
          RepositoryModule.forRoot({
            drivers: [
              {
                driver: AccountsDriver,
                entities: [{ key: 'accounts', entity: PlainAccountEntity }],
              },
            ],
          }),
        ],
      }).compile(),
    ).rejects.toThrow(RepositoryBootException);
  });
});
