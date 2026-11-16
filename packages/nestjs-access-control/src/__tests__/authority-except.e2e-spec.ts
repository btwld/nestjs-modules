import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CoreModule } from '@concepta/nestjs-core';
import { RepositoryModule } from '@concepta/nestjs-repository';
import { CaslAuthority } from '@concepta/nestjs-repository/optional/casl';
import { TypeOrmSqliteRepositoryModule } from '@concepta/nestjs-repository-typeorm/sqlite';

import { AccessControlModule } from '../access-control.module.js';
import { AccessRulesInvalidException } from '../domain/exceptions/access-rules-invalid.exception.js';

@Entity('except_ledger')
class ExceptLedgerEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'integer' })
  total!: number;
}

@Module({
  providers: [
    {
      provide: CaslAuthority,
      useFactory: () => new CaslAuthority({ rulesFor: async () => [] }),
    },
  ],
  exports: [CaslAuthority],
})
class ExceptAuthorityModule {}

/** One governed entity, `ledger`, with access control sharing its authority. */
const startWith = async (except: string[]) => {
  const moduleRef = await Test.createTestingModule({
    imports: [
      CoreModule.forRoot(),
      TypeOrmModule.forRoot({
        type: 'better-sqlite3',
        database: ':memory:',
        synchronize: true,
        entities: [ExceptLedgerEntity],
      }),
      RepositoryModule.forRoot({
        imports: [ExceptAuthorityModule],
        adapters: [
          {
            adapter: TypeOrmSqliteRepositoryModule,
            entities: [
              {
                key: 'ledger',
                entity: ExceptLedgerEntity,
                authority: { access: 'governed', authority: CaslAuthority },
              },
            ],
          },
        ],
      }),
      AccessControlModule.forRootAsync({
        imports: [ExceptAuthorityModule],
        inject: [CaslAuthority],
        useFactory: (authority: CaslAuthority) => ({
          authority: { authority, except },
          actorResolver: { actorFor: async () => undefined },
        }),
      }),
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  try {
    await app.init();
  } finally {
    await app.close();
  }
};

describe('authority.except at startup', () => {
  it('fails on an entry naming an entity a repository attached the authority to', async () => {
    const failure = await startWith(['ledger']).catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(AccessRulesInvalidException);
    expect(
      failure instanceof AccessRulesInvalidException &&
        failure.context.problems,
    ).toEqual([
      'authority.except names "ledger", which the authority governs; remove it, so the authority decides its routes',
    ]);
  });

  it('starts with an entry naming a resource no entity stands behind', async () => {
    await expect(startWith(['report'])).resolves.toBeUndefined();
  });
});
