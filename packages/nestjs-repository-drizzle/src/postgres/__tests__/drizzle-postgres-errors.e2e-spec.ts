import { integer, pgTable, text } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/pg-proxy';

import { type INestApplicationContext, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DrizzleModule } from '@nestjs/drizzle';

import { CoreModule } from '@concepta/nestjs-core';
import {
  getDynamicRepositoryToken,
  RepositoryDatabaseException,
  RepositoryModule,
  type RepositoryInterface,
  Where,
} from '@concepta/nestjs-repository';

import { DrizzlePostgresRepositoryModule } from '../drizzle-postgres-repository.module.js';

const noteTable = pgTable('error_note', {
  id: integer().primaryKey(),
  name: text().notNull(),
});

class NoteEntity {
  declare id: number;
  declare name: string;
}

@Module({})
class ErrorsRootModule {}

describe('DrizzlePostgresRepository reporting a failed query', () => {
  let app: INestApplicationContext;
  let notes: RepositoryInterface<NoteEntity>;
  // What the database client fails each query with.
  let failure: unknown;

  beforeAll(async () => {
    app = await NestFactory.createApplicationContext(
      {
        module: ErrorsRootModule,
        imports: [
          CoreModule.forRoot(),
          DrizzleModule.forRootAsync({
            useFactory: () => ({
              db: drizzle(() => Promise.reject(failure)),
            }),
          }),
          RepositoryModule.forRoot({
            drivers: [
              {
                driver: DrizzlePostgresRepositoryModule,
                entities: [
                  { key: 'note', entity: NoteEntity, table: noteTable },
                ],
              },
            ],
          }),
        ],
      },
      { abortOnError: false },
    );
    notes = app.get(getDynamicRepositoryToken('note'));
  });

  afterAll(async () => {
    await app.close();
  });

  const findSecret = (): Promise<NoteEntity[]> =>
    notes.find({ where: Where.eq('name', 'the-secret-name') });

  it("reports the client's message and code, never the query or its values", async () => {
    failure = Object.assign(new Error('relation "error_note" is gone'), {
      code: '42P01',
    });

    const error = await findSecret().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(RepositoryDatabaseException);
    expect(error).toEqual(
      expect.objectContaining({
        message:
          'The postgres database failed a query on the note repository: ' +
          'relation "error_note" is gone',
        context: expect.objectContaining({
          database: 'postgres',
          code: '42P01',
        }),
      }),
    );
  });

  it.each([
    ['nothing', undefined],
    ['a value that is not an error', 'the-secret-name'],
  ])(
    'reports a client that fails with %s without the query or its values',
    async (_, thrown) => {
      failure = thrown;

      const error = await findSecret().catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(RepositoryDatabaseException);
      expect(error).toEqual(
        expect.objectContaining({
          message:
            'The postgres database failed a query on the note repository: ' +
            'the database client gave no error',
          context: expect.objectContaining({
            database: 'postgres',
            code: undefined,
          }),
        }),
      );
    },
  );
});
