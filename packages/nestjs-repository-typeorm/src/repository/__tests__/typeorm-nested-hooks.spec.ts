import { type DataSourceOptions } from 'typeorm';
import { Column, Entity } from 'typeorm';

import { type PlainLiteralObject } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  AppContextHost,
  CoreModule,
  type DeepPartial,
  HooksCtx,
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

@Entity()
class PetEntityFixture extends CommonSqliteEntity {
  @Column()
  name!: string;
}

@Entity()
class NoteEntityFixture extends CommonSqliteEntity {
  @Column()
  body!: string;

  // Nullable so the row can be written unstamped. A NOT NULL column would
  // turn the defect into a database error, which is how the reporter found it
  // but which would also let a bare "it threw" assertion pass for the wrong
  // reason.
  @Column({ type: 'varchar', nullable: true })
  owner!: string | null;
}

/** Registered for notes. The hook whose silent absence is the defect. */
@RepoHook()
class NoteOwnerHook {
  @BeforeCreate()
  async stamp(data: DeepPartial<NoteEntityFixture>) {
    return { ...data, owner: 'owner-from-hook' };
  }
}

/**
 * Registered for pets. Writes a note from `afterCreate`, forwarding its own
 * `ctx` — which is what the repository-hook documentation tells you to do, and
 * what used to mean the note was written with none of its own hooks run.
 */
@RepoHook()
class PetNoteHook {
  constructor(
    @InjectDynamicRepository(NOTES)
    private readonly notes: RepositoryInterface<NoteEntityFixture>,
  ) {}

  @AfterCreate()
  async addNote(pet: PetEntityFixture, ctx?: PlainLiteralObject) {
    await this.notes.create({ body: `pet ${pet.name}` }, { ctx });
    return pet;
  }
}

/**
 * Stands in for a hook the pet route declared with `@UseHooks()`. Ungated, so
 * the forwarded context carries it into the note repository too — which is the
 * pre-existing behaviour of a route-declared hook and is why it must not
 * recurse.
 */
const routeHookCalls: string[] = [];

@RepoHook()
class RouteAuditHook {
  @AfterCreate()
  async record(row: PlainLiteralObject) {
    routeHookCalls.push(String(row.id));
    return row;
  }
}

const ormConfig: DataSourceOptions = {
  type: 'sqlite',
  database: ':memory:',
  synchronize: true,
  entities: [PetEntityFixture, NoteEntityFixture],
};

describe('a hook forwarding its ctx into another entity', () => {
  let moduleFixture: TestingModule;
  let pets: RepositoryInterface<PetEntityFixture>;
  let notes: RepositoryInterface<NoteEntityFixture>;

  beforeEach(async () => {
    routeHookCalls.length = 0;
    moduleFixture = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(ormConfig),
        CoreModule.forRoot(),
        RepositoryModule.forRoot({}),
        RepositoryModule.forFeature({
          module: TypeOrmRepositoryModule,
          entities: [
            {
              key: PETS,
              entity: PetEntityFixture,
              hooks: [PetNoteHook],
            },
            {
              key: NOTES,
              entity: NoteEntityFixture,
              hooks: [NoteOwnerHook],
            },
          ],
        }),
      ],
      providers: [PetNoteHook, NoteOwnerHook, RouteAuditHook],
    }).compile();

    await moduleFixture.init();

    pets = moduleFixture.get(getDynamicRepositoryToken(PETS));
    notes = moduleFixture.get(getDynamicRepositoryToken(NOTES));
  });

  afterEach(async () => {
    await moduleFixture.close();
  });

  // No `@UseHooks()` anywhere and no HooksCtx overlay on the context, so the
  // forwarded ctx carries no hook list at all. Before the fix this wrote the
  // note with `owner` null and raised nothing.
  it("runs the nested entity's own hooks", async () => {
    await pets.create({ name: 'Rex' }, { ctx: new AppContextHost() });

    const written = await notes.find({});

    expect(written).toHaveLength(1);
    expect(written[0]?.owner).toBe('owner-from-hook');
  });

  it('runs them when the outer call carried no context either', async () => {
    await pets.create({ name: 'Rex' });

    const written = await notes.find({});

    expect(written).toHaveLength(1);
    expect(written[0]?.owner).toBe('owner-from-hook');
  });

  // The reported shape exactly: the pet route declared its own hook, so the
  // forwarded context carries a hook list — just not one containing any of the
  // note entity's. An empty list could be mistaken for "the overlay was
  // missing"; a populated foreign one cannot.
  it("runs them when the forwarded context carries another entity's hooks", async () => {
    const ctx = new AppContextHost();
    ctx.defineOverlay(HooksCtx, {
      hooks: [{ hook: RouteAuditHook, type: RepoHook.KEY }],
    });

    await pets.create({ name: 'Rex' }, { ctx });

    const written = await notes.find({});

    expect(written).toHaveLength(1);
    expect(written[0]?.owner).toBe('owner-from-hook');
    // And the route hook still ran, so the foreign list was genuinely present
    // rather than quietly dropped.
    expect(routeHookCalls).toHaveLength(2);
  });
});
