import { type DataSourceOptions } from 'typeorm';
import { Column, Entity } from 'typeorm';

import { Test, type TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  AppContextHost,
  type AppContextInterface,
  CoreModule,
  type DeepPartial,
  OverlayNotDefinedException,
  OverlayRef,
} from '@concepta/nestjs-core';
import {
  AfterCreate,
  BeforeCreate,
  getDynamicRepositoryToken,
  InjectDynamicRepository,
  RepoHook,
  RepositoryModule,
  type RepositoryInterface,
} from '@concepta/nestjs-repository';

import { CommonSqliteEntity } from '../../entities/common/common-sqlite.entity.js';
import { TypeOrmRepositoryModule } from '../../typeorm-repository.module.js';

const PETS = 'pets';
const NOTES = 'notes';

const TenantCtx = new OverlayRef<'withTenant', { tenantId: string }>(
  'withTenant',
);

@Entity()
class PetEntityFixture extends CommonSqliteEntity {
  @Column()
  name!: string;
}

@Entity()
class NoteEntityFixture extends CommonSqliteEntity {
  @Column()
  body!: string;

  // Nullable on purpose: an unstamped row has to be writable, or a refusal
  // test would pass on the database's NOT NULL error rather than on the guard.
  @Column({ type: 'varchar', nullable: true })
  owner!: string | null;
}

/**
 * Registered for notes, and the kind of hook this is all about: its
 * correctness depends on an overlay, so it reads that overlay with
 * `require()` and lets an absent one refuse the call.
 *
 * What these tests guard is the hook *shape*. Reading an overlay through
 * `require(ref).withRef()` is fail-closed twice over — `require` asserts, and
 * the host's own proxy throws for an absent `with*` either way — so the
 * regression they catch is a hook rewritten to branch on `supports()` and
 * return its payload unchanged.
 *
 * `replace: true` because the stamp is an authorization decision — without it
 * the default merge lets the caller's own `owner` win.
 */
@RepoHook()
class NoteTenantHook {
  @BeforeCreate({ replace: true })
  async stamp(
    data: DeepPartial<NoteEntityFixture>,
    ctx: AppContextInterface,
  ): Promise<DeepPartial<NoteEntityFixture>> {
    const tenant = ctx.require(TenantCtx).withTenant();

    return { ...data, owner: tenant.tenantId };
  }
}

/**
 * Registered for pets. Writes a note from `afterCreate`, forwarding its own
 * `ctx` — the nested path #477 made reachable.
 *
 * It supplies an `owner` of its own, standing in for a value that reached a
 * write from the request body. The stamp has to beat it.
 */
@RepoHook()
class PetNoteHook {
  constructor(
    @InjectDynamicRepository(NOTES)
    private readonly notes: RepositoryInterface<NoteEntityFixture>,
  ) {}

  @AfterCreate()
  async addNote(pet: PetEntityFixture, ctx?: AppContextInterface) {
    await this.notes.create(
      { body: `pet ${pet.name}`, owner: 'caller-supplied' },
      { ctx },
    );
    return pet;
  }
}

const ormConfig: DataSourceOptions = {
  type: 'sqlite',
  database: ':memory:',
  synchronize: true,
  entities: [PetEntityFixture, NoteEntityFixture],
};

describe('a nested hook whose correctness depends on a ctx overlay', () => {
  let moduleFixture: TestingModule;
  let pets: RepositoryInterface<PetEntityFixture>;
  let notes: RepositoryInterface<NoteEntityFixture>;

  beforeEach(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(ormConfig),
        CoreModule.forRoot(),
        RepositoryModule.forRoot({}),
        RepositoryModule.forFeature({
          module: TypeOrmRepositoryModule,
          entities: [
            { key: PETS, entity: PetEntityFixture, hooks: [PetNoteHook] },
            { key: NOTES, entity: NoteEntityFixture, hooks: [NoteTenantHook] },
          ],
        }),
      ],
      providers: [PetNoteHook, NoteTenantHook],
    }).compile();

    await moduleFixture.init();

    pets = moduleFixture.get(getDynamicRepositoryToken(PETS));
    notes = moduleFixture.get(getDynamicRepositoryToken(NOTES));
  });

  afterEach(async () => {
    await moduleFixture.close();
  });

  // The overlay reaches the nested write by inheritance: each entity's ambient
  // context is a prototype child of its caller's, so an overlay the outer call
  // supplied is still readable two repositories down.
  it('reads an overlay the outer call supplied, and beats the caller value', async () => {
    const ctx = new AppContextHost();
    ctx.defineOverlay(TenantCtx, { tenantId: 'acme' });

    await pets.create({ name: 'Rex' }, { ctx });

    const written = await notes.find({});

    expect(written).toHaveLength(1);
    expect(written[0]?.owner).toBe('acme');
  });

  // The forwarded context is present and perfectly usable — it just carries no
  // tenant — so a hook that branched on `supports()` would write the row with
  // the caller's own `owner` instead.
  //
  // Only the note is refused: the pet is already inserted by the time
  // `afterCreate` runs, and nothing here opens a transaction. A refusal from a
  // hook that writes to another entity leaves a partial write unless the whole
  // operation runs inside a `TransactionScope`.
  it('refuses the nested write when the forwarded context lacks the overlay', async () => {
    await expect(
      pets.create({ name: 'Rex' }, { ctx: new AppContextHost() }),
    ).rejects.toThrow(OverlayNotDefinedException);

    expect(await notes.find({})).toHaveLength(0);
  });

  it('refuses when the outer call carried no context at all', async () => {
    await expect(pets.create({ name: 'Rex' })).rejects.toThrow(
      OverlayNotDefinedException,
    );

    expect(await notes.find({})).toHaveLength(0);
  });
});
