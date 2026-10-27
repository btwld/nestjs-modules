import { type PlainLiteralObject } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import {
  AppContextHost,
  type AppContextInterface,
  CoreModule,
  type DeepPartial,
  HooksCtx,
  OverlayNotDefinedException,
  OverlayRef,
} from '@concepta/nestjs-core';

import { type MemoryRepositoryFixture } from '../../__fixtures__/memory/memory-repository.fixture.js';
import { MemoryRepositoryModuleFixture } from '../../__fixtures__/memory/memory-repository.module.fixture.js';
import {
  NOTE_TOKEN,
  NoteEntityFixture,
  type NoteFixture,
  PET_TOKEN,
  PetEntityFixture,
  type PetFixture,
} from '../../__fixtures__/memory/pet-note.fixture.js';
import { InjectDynamicRepository } from '../../decorators/inject-dynamic-repository.decorator.js';
import { type RepositoryInterface } from '../../repository/interfaces/repository.interface.js';
import { RepositoryModule } from '../../repository.module.js';
import { getDynamicRepositoryToken } from '../../utils/get-dynamic-repository-token.js';
import {
  AfterCreate,
  BeforeCreate,
  RepoHook,
} from '../repository-hook.decorators.js';

const TenantCtx = new OverlayRef<'withTenant', { tenantId: string }>(
  'withTenant',
);

/** Registered for pets: writes a note from `afterCreate`, forwarding its ctx. */
@RepoHook()
class PetNoteHook {
  constructor(
    @InjectDynamicRepository(NOTE_TOKEN)
    private readonly notes: RepositoryInterface<NoteFixture>,
  ) {}

  @AfterCreate()
  async addNote(pet: PetFixture, ctx?: AppContextInterface) {
    await this.notes.create(
      { body: `pet ${pet.name}`, owner: 'caller-supplied' },
      { ctx },
    );
    return pet;
  }
}

/** Registered for notes: stamps the owner from an overlay it requires. */
@RepoHook()
class NoteTenantHook {
  @BeforeCreate({ replace: true })
  async stamp(
    data: DeepPartial<NoteFixture>,
    ctx: AppContextInterface,
  ): Promise<DeepPartial<NoteFixture>> {
    return { ...data, owner: ctx.require(TenantCtx).withTenant().tenantId };
  }
}

/** Stands in for a hook the pet route declared with `@UseHooks()`. */
const routeHookCalls: string[] = [];

@RepoHook()
class RouteAuditHook {
  @AfterCreate()
  async record(row: PlainLiteralObject) {
    routeHookCalls.push(String(row.id));
    return row;
  }
}

describe('a hook writing to another entity with its own ctx', () => {
  let moduleRef: TestingModule;
  let pets: MemoryRepositoryFixture<PetFixture>;
  let notes: MemoryRepositoryFixture<NoteFixture>;

  beforeEach(async () => {
    routeHookCalls.length = 0;
    moduleRef = await Test.createTestingModule({
      imports: [
        CoreModule.forRoot(),
        RepositoryModule.forRoot({
          drivers: [
            {
              driver: MemoryRepositoryModuleFixture,
              entities: [
                {
                  key: PET_TOKEN,
                  entity: PetEntityFixture,
                  hooks: [PetNoteHook],
                },
                {
                  key: NOTE_TOKEN,
                  entity: NoteEntityFixture,
                  hooks: [NoteTenantHook],
                },
              ],
            },
          ],
        }),
        RepositoryModule.forFeature([NOTE_TOKEN]),
      ],
      providers: [PetNoteHook, NoteTenantHook, RouteAuditHook],
    }).compile();

    await moduleRef.init();

    pets = moduleRef.get(getDynamicRepositoryToken(PET_TOKEN));
    notes = moduleRef.get(getDynamicRepositoryToken(NOTE_TOKEN));
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  // Each entity's ambient context is a child of its caller's, so an overlay
  // the outer call supplied is still readable two repositories down.
  it('reads an overlay the outer call supplied, and beats the caller value', async () => {
    const ctx = new AppContextHost();
    ctx.defineOverlay(TenantCtx, { tenantId: 'acme' });

    await pets.create({ name: 'Rex' }, { ctx });

    expect(notes.stored.map(({ owner }) => owner)).toEqual(['acme']);
  });

  // The forwarded context carries a hook list, just not one with any of the
  // note's hooks. An empty list could be mistaken for a missing overlay; a
  // populated foreign one cannot.
  it("runs the nested entity's hooks when the context carries another entity's", async () => {
    const ctx = new AppContextHost();
    ctx.defineOverlay(TenantCtx, { tenantId: 'acme' });
    ctx.defineOverlay(HooksCtx, {
      hooks: [{ hook: RouteAuditHook, type: RepoHook.KEY }],
    });

    await pets.create({ name: 'Rex' }, { ctx });

    expect(notes.stored.map(({ owner }) => owner)).toEqual(['acme']);
    // The route hook ran for the pet and the note, so the foreign list was
    // present rather than dropped.
    expect(routeHookCalls).toHaveLength(2);
  });

  // The pet is already written when `afterCreate` runs, and nothing here opens
  // a transaction, so only the note is refused.
  it('refuses the nested write when the forwarded context lacks the overlay', async () => {
    await expect(
      pets.create({ name: 'Rex' }, { ctx: new AppContextHost() }),
    ).rejects.toThrow(OverlayNotDefinedException);

    expect(notes.stored).toEqual([]);
    expect(pets.stored).toHaveLength(1);
  });

  it('refuses when the outer call carried no context at all', async () => {
    await expect(pets.create({ name: 'Rex' })).rejects.toThrow(
      OverlayNotDefinedException,
    );

    expect(notes.stored).toEqual([]);
  });
});
