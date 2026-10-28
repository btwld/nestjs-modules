import { type DataSource } from 'typeorm';

import { HttpStatus } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getDataSourceToken, TypeOrmModule } from '@nestjs/typeorm';

import {
  EntityNotFoundException,
  getDynamicRepositoryToken,
  RepositoryModule,
} from '@concepta/nestjs-repository';

import { NoteEntityFixture } from '../../__fixtures__/repository/entity/note.entity.fixture.js';
import { TypeOrmRepositoryModule } from '../../typeorm-repository.module.js';
import { type TypeOrmRepository } from '../typeorm-repository.js';

const NOTES = 'notes';

describe('TypeOrmRepository update and replace write only their data (e2e)', () => {
  let moduleRef: TestingModule;
  let notes: TypeOrmRepository<NoteEntityFixture>;
  let dataSource: DataSource;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          synchronize: true,
          entities: [NoteEntityFixture],
        }),
        RepositoryModule.forRoot({
          drivers: [
            {
              driver: TypeOrmRepositoryModule,
              entities: [{ key: NOTES, entity: NoteEntityFixture }],
            },
          ],
        }),
      ],
    }).compile();

    notes = moduleRef.get(getDynamicRepositoryToken(NOTES));
    dataSource = moduleRef.get(getDataSourceToken());
  });

  afterEach(() => moduleRef.close());

  // Another writer changes `body` after the caller read the row; the caller's
  // write names only `title`, so `body` keeps the newer value.
  it.each([
    [
      'update',
      (stale: NoteEntityFixture) => notes.update(stale, { title: 'Renamed' }),
    ],
    [
      'replace',
      (stale: NoteEntityFixture) => notes.replace(stale, { title: 'Renamed' }),
    ],
  ])('%s keeps a column a later writer changed', async (_operation, write) => {
    const stale = await notes.create({ title: 'Draft', body: 'First' });
    await notes.update(stale, { body: 'Second' });

    const written = await write(stale);

    const expected = { id: stale.id, title: 'Renamed', body: 'Second' };
    expect(written).toEqual(expected);
    expect(
      await dataSource
        .getRepository(NoteEntityFixture)
        .findOneBy({ id: stale.id }),
    ).toEqual(expected);
  });

  it.each([
    [
      'update',
      (stale: NoteEntityFixture) => notes.update(stale, { title: 'Renamed' }),
    ],
    [
      'replace',
      (stale: NoteEntityFixture) => notes.replace(stale, { title: 'Renamed' }),
    ],
  ])(
    '%s of a row deleted after it was read is not found',
    async (_operation, write) => {
      const stale = await notes.create({ title: 'Draft', body: 'First' });
      await notes.delete(stale);

      const failure = write(stale);

      await expect(failure).rejects.toThrow(EntityNotFoundException);
      await expect(failure).rejects.toMatchObject({
        httpStatus: HttpStatus.NOT_FOUND,
        fault: 'client',
      });
      expect(await dataSource.getRepository(NoteEntityFixture).count()).toEqual(
        0,
      );
    },
  );

  it('returns the stored row when data changes nothing', async () => {
    const stale = await notes.create({ title: 'Draft', body: 'First' });
    await notes.update(stale, { body: 'Second' });

    expect(await notes.update(stale, {})).toEqual({
      id: stale.id,
      title: 'Draft',
      body: 'Second',
    });
  });
});
