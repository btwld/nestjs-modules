import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { DataSource } from 'typeorm';

import { relationOrmConfig } from '../../__fixtures__/repository/config/relation-ormconfig.fixture.js';
import { AuthorEntityFixture } from '../../__fixtures__/repository/entity/author.entity.fixture.js';
import { PostEntityFixture } from '../../__fixtures__/repository/entity/post.entity.fixture.js';
import { TypeOrmRepository } from '../typeorm-repository.js';

/**
 * One entity on two connections, as when a relation's target lives in
 * another database: each repository reports the rows of its own connection,
 * and a relation names its target as the target's own repository does.
 */
describe('TypeOrmRepository (two connections)', () => {
  let directory: string;
  let app: DataSource;
  let content: DataSource;

  const connect = (file: string) =>
    new DataSource({
      type: 'better-sqlite3',
      database: join(directory, file),
      synchronize: true,
      entities: relationOrmConfig.entities,
    }).initialize();

  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), 'typeorm-connections-'));
    app = await connect('app.sqlite');
    content = await connect('content.sqlite');
  });

  afterEach(async () => {
    await app.destroy();
    await content.destroy();
    rmSync(directory, { recursive: true, force: true });
  });

  it('names a relation target as its repository on another connection does', () => {
    const authors = new TypeOrmRepository(
      app.getRepository(AuthorEntityFixture),
      { entityKey: 'authors' },
    );
    const posts = new TypeOrmRepository(
      content.getRepository(PostEntityFixture),
      { entityKey: 'posts' },
    );

    const relation = authors.metadata.relations?.find(
      ({ name }) => name === 'posts',
    );

    expect(relation?.targetEntity).toBe(posts.metadata.name);
    // The relation's rows are the ones its own connection would read.
    expect(relation?.targetUrn).toBe(
      `urn:typeorm:${join(directory, 'app.sqlite')}:post_entity_fixture`,
    );
    expect(posts.metadata.urn).toBe(
      `urn:typeorm:${join(directory, 'content.sqlite')}:post_entity_fixture`,
    );
  });
});
