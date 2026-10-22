import { type PlainLiteralObject, type Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { CoreModule } from '@concepta/nestjs-core';

import { MemoryRepositoryModuleFixture } from '../../__fixtures__/memory/memory-repository.module.fixture.js';
import {
  NOTE_TOKEN,
  NoteEntityFixture,
} from '../../__fixtures__/memory/pet-note.fixture.js';
import { HookBootException } from '../../exceptions/hook-boot.exception.js';
import { RepositoryModule } from '../../repository.module.js';
import { AfterCreate, RepoHook } from '../repository-hook.decorators.js';

@RepoHook()
class NoteHook {
  @AfterCreate()
  async noop(row: PlainLiteralObject) {
    return row;
  }
}

/**
 * Compiles a container so the checks run where `RepositoryModule.forRoot()`
 * binds. Each check's own cases are in `hook-boot-checks.spec.ts`.
 */
const boot = async (providers: Type[], withCore = true): Promise<void> => {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ...(withCore ? [CoreModule.forRoot()] : []),
      RepositoryModule.forRoot({
        drivers: [
          {
            driver: MemoryRepositoryModuleFixture,
            entities: [
              { key: NOTE_TOKEN, entity: NoteEntityFixture, hooks: [NoteHook] },
            ],
          },
        ],
      }),
    ],
    providers,
  }).compile();

  await moduleRef.close();
};

describe('hook startup checks', () => {
  it('starts with a registered hook the container provides', async () => {
    await expect(boot([NoteHook])).resolves.toBeUndefined();
  });

  it('refuses to start when the container cannot resolve a registered hook', async () => {
    await expect(boot([])).rejects.toThrow(HookBootException);
  });

  it('refuses to start when hooks are registered without CoreModule', async () => {
    await expect(boot([NoteHook], false)).rejects.toThrow(HookBootException);
  });
});
