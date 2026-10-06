import { Column, Entity, type DataSourceOptions } from 'typeorm';

import { type PlainLiteralObject, type Provider } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CoreModule, Hook, type HookOption } from '@concepta/nestjs-core';
import {
  AfterCreate,
  HookBootException,
  RepoHook,
  RepositoryModule,
} from '@concepta/nestjs-repository';

import { CommonSqliteEntity } from '../../entities/common/common-sqlite.entity.js';
import { TypeOrmRepositoryModule } from '../../typeorm-repository.module.js';

const NOTES = 'notes';

@Entity()
class NoteEntityFixture extends CommonSqliteEntity {
  @Column()
  body!: string;
}

@RepoHook()
class GoodHook {
  @AfterCreate()
  async noop(row: PlainLiteralObject) {
    return row;
  }
}

class UndecoratedHook {
  @AfterCreate()
  async noop(row: PlainLiteralObject) {
    return row;
  }
}

@Hook({ type: 'someOtherSubsystem' })
class ForeignHook {
  @AfterCreate()
  async noop(row: PlainLiteralObject) {
    return row;
  }
}

const ormConfig: DataSourceOptions = {
  type: 'better-sqlite3',
  database: ':memory:',
  synchronize: true,
  entities: [NoteEntityFixture],
};

/**
 * Boots a real container so the checks run where they actually run — through
 * `OnApplicationBootstrap` and `DiscoveryService` — rather than against a stub.
 */
const boot = async (
  hooks: HookOption[],
  providers: Provider[],
  { viaDriver = false } = {},
): Promise<void> => {
  const entities = [{ key: NOTES, entity: NoteEntityFixture, hooks }];

  const moduleFixture = await Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot(ormConfig),
      CoreModule.forRoot(),
      RepositoryModule.forRoot({}),
      viaDriver
        ? // Registering through the driver directly means nothing binds the
          // declaration — the case the call-time refusal also covers.
          TypeOrmRepositoryModule.forFeature(entities)
        : RepositoryModule.forFeature({
            module: TypeOrmRepositoryModule,
            entities,
          }),
    ],
    providers,
  }).compile();

  try {
    await moduleFixture.init();
  } finally {
    await moduleFixture.close();
  }
};

describe('hook startup checks, through a real container', () => {
  it('boots a correctly registered hook', async () => {
    await expect(boot([GoodHook], [GoodHook])).resolves.toBeUndefined();
  });

  it('refuses a hook the container cannot resolve', async () => {
    await expect(boot([GoodHook], [])).rejects.toThrow(HookBootException);
  });

  it('refuses a hook with no class-level decorator', async () => {
    await expect(boot([UndecoratedHook], [UndecoratedHook])).rejects.toThrow(
      HookBootException,
    );
  });

  it('refuses a hook decorated for another subsystem', async () => {
    await expect(boot([ForeignHook], [ForeignHook])).rejects.toThrow(
      HookBootException,
    );
  });

  it('refuses a declaration that nothing bound', async () => {
    await expect(
      boot([GoodHook], [GoodHook], { viaDriver: true }),
    ).rejects.toThrow(HookBootException);
  });
});
