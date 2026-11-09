import { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import { integer, pgTable, text } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/pglite';

import { type INestApplicationContext, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DrizzleModule } from '@nestjs/drizzle';

import { AppContextHost, CoreModule } from '@concepta/nestjs-core';
import {
  getDynamicRepositoryToken,
  RepositoryModule,
  type RepositoryInterface,
  RowScopeCtx,
  TransactionScope,
} from '@concepta/nestjs-repository';

import { DrizzlePostgresRepositoryModule } from '../drizzle-postgres-repository.module.js';
import { type DrizzlePostgresTransactionSettingsResolver } from '../drizzle-postgres-transaction-settings-resolver.type.js';

/**
 * A trigger stamps each written row with the `app.tenant_id` setting the
 * write ran under, so the rows show which settings each transaction had.
 */
const noteTable = pgTable('settings_note', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  stamped: text(),
  version: integer().notNull(),
});

class NoteEntity {
  declare id: number;
  declare name: string;
  declare stamped: string | null;
  declare version: number;
}

const TENANT_A = 'tenant-a';
const TENANT_B = 'tenant-b';
// The settings below turn this tenant into a setting name Postgres refuses.
const TENANT_REFUSED = 'tenant-refused';

function tenantCtx(tenantId?: string): AppContextHost {
  const ctx = new AppContextHost();
  if (tenantId) {
    ctx.defineOverlay(RowScopeCtx, { tenantId });
  }
  return ctx;
}

@Module({})
class SettingsRootModule {}

describe('transactionSettings on the Drizzle Postgres adapter', () => {
  let app: INestApplicationContext;
  let notes: RepositoryInterface<NoteEntity>;
  let txScope: TransactionScope;
  const transactionSettings = vi.fn<DrizzlePostgresTransactionSettingsResolver>(
    (ctx) => {
      if (!ctx.supports(RowScopeCtx)) {
        return {};
      }
      const { tenantId } = ctx.with(RowScopeCtx);
      return tenantId === TENANT_REFUSED
        ? { 'no-dot-is-refused': tenantId }
        : { 'app.tenant_id': tenantId, 'app.skipped': undefined };
    },
  );

  const createIn = (tenantId: string | undefined, name: string) =>
    txScope.run(tenantCtx(tenantId), (txCtx) =>
      notes.create({ name, version: 1 }, { ctx: txCtx }),
    );

  beforeAll(async () => {
    app = await NestFactory.createApplicationContext(
      {
        module: SettingsRootModule,
        imports: [
          CoreModule.forRoot(),
          DrizzleModule.forRootAsync({
            useFactory: async () => {
              const db = drizzle({ client: new PGlite() });
              await db.execute(sql`create table settings_note (
                id integer primary key generated always as identity,
                name text not null,
                stamped text,
                version integer not null
              )`);
              await db.execute(sql`create function stamp_setting()
                returns trigger language plpgsql as $$
                begin
                  new.stamped := current_setting('app.tenant_id', true);
                  return new;
                end $$`);
              await db.execute(sql`create trigger stamp_setting
                before insert or update on settings_note
                for each row execute function stamp_setting()`);
              return { db };
            },
          }),
          RepositoryModule.forRoot({
            drivers: [
              {
                driver: DrizzlePostgresRepositoryModule,
                entities: [
                  {
                    key: 'note',
                    entity: NoteEntity,
                    table: noteTable,
                    version: 'version',
                  },
                ],
                options: { transactionSettings },
              },
            ],
          }),
        ],
      },
      { abortOnError: false },
    );
    notes = app.get(getDynamicRepositoryToken('note'));
    txScope = app.get(TransactionScope);
  });

  afterAll(async () => {
    await app.close();
  });

  it("sets the caller's values in every transaction, skipping undefined ones", async () => {
    expect((await createIn(TENANT_A, 'a')).stamped).toBe(TENANT_A);
    expect((await createIn(TENANT_B, 'b')).stamped).toBe(TENANT_B);
    expect(transactionSettings).toHaveBeenCalledWith(
      expect.any(AppContextHost),
      'default',
    );
  });

  it('gives the next transaction on the connection none of them', async () => {
    await createIn(TENANT_A, 'a');

    // Postgres reads a setting a transaction once set, and no longer has,
    // as ''.
    expect((await createIn(undefined, 'none')).stamped).toBe('');
  });

  it('sets nothing on a statement outside a transaction', async () => {
    await createIn(TENANT_A, 'a');

    const note = await notes.create(
      { name: 'outside', version: 1 },
      { ctx: tenantCtx(TENANT_A) },
    );

    expect(note.stamped).toBe('');
  });

  it('sets nothing on a versioned write outside a transaction', async () => {
    const note = await createIn(TENANT_A, 'a');

    const updated = await notes.update(
      note,
      { name: 'a-2' },
      { ctx: tenantCtx(TENANT_B) },
    );

    expect(updated).toEqual({
      id: note.id,
      name: 'a-2',
      stamped: '',
      version: 2,
    });
  });

  it('rolls back a transaction whose setting fails, with the database error', async () => {
    const before = await notes.count();

    await expect(createIn(TENANT_REFUSED, 'refused')).rejects.toThrow(
      'unrecognized configuration parameter "no-dot-is-refused"',
    );

    expect(await notes.count()).toBe(before);
    expect((await createIn(TENANT_B, 'b')).stamped).toBe(TENANT_B);
  });
});
