import { HttpStatus, Module, type Type } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { AppContextHost, CoreModule } from '@concepta/nestjs-core';

import {
  ArchivedPostEntityFixture,
  AUTHOR_TAG_TOKEN,
  AUTHOR_TOKEN,
  AuthorEntityFixture,
  type AuthorFixture,
  AuthorRowScopeFixture,
  AuthorTagEntityFixture,
  type AuthorTagFixture,
  COMPANY_TOKEN,
  CompanyEntityFixture,
  type CompanyFixture,
  DriftedAuthorEntityFixture,
  POST_TOKEN,
  PostEntityFixture,
  type PostFixture,
  PostRowScopeFixture,
  PROFILE_TOKEN,
  ProfileEntityFixture,
  type ProfileFixture,
  TAG_TOKEN,
  TagEntityFixture,
  type TagFixture,
} from '../../__fixtures__/memory/federation.fixture.js';
import { type MemoryRepositoryFixture } from '../../__fixtures__/memory/memory-repository.fixture.js';
import { MemoryRepositoryModuleFixture } from '../../__fixtures__/memory/memory-repository.module.fixture.js';
import { type TenantScopeFixture } from '../../__fixtures__/memory/order-row-scope.fixture.js';
import { RepositoryBootException } from '../../exceptions/repository-boot.exception.js';
import {
  BeforeRead,
  RepoHook,
} from '../../hooks/repository-hook.decorators.js';
import {
  type RelationConfig,
  type RepositoryProviderOptions,
} from '../../interfaces/repository-provider-options.interface.js';
import { type RepositoryFindOptions } from '../../repository/interfaces/repository-options.interface.js';
import { Where } from '../../repository/where.helpers.js';
import { RepositoryModule } from '../../repository.module.js';
import { RowScopeCtx } from '../../row-scope/interfaces/row-scope-context.interface.js';
import { getDynamicRepositoryToken } from '../../utils/get-dynamic-repository-token.js';

const FEDERATED: Record<string, RelationConfig> = {
  posts: { federated: true },
  profile: { federated: true },
  company: { federated: true },
  tags: { federated: true },
};

const published = Where.rel('posts', Where.eq('published', true));

const REFUSED = {
  httpStatus: HttpStatus.BAD_REQUEST,
  fault: 'client',
};

const ctxFor = (scope: TenantScopeFixture): AppContextHost => {
  const ctx = new AppContextHost();
  ctx.defineOverlay(RowScopeCtx, scope, { immutable: true });
  return ctx;
};

const ACME = ctxFor({ tenantId: 'acme' });
const GLOBEX = ctxFor({ tenantId: 'globex' });

/** Redefines the row scope on the caller's own `ctx`, where it is mutable. */
@RepoHook()
class RedefinesScopeHook {
  @BeforeRead()
  beforeRead(options: RepositoryFindOptions) {
    const host = AppContextHost.from(options.ctx);
    host.removeOverlay(RowScopeCtx);
    host.defineOverlay(RowScopeCtx, { tenantId: 'globex' });
    return options;
  }
}

/** Hands every read of authors another tenant's `ctx`. */
@RepoHook()
class SwapsCtxHook {
  @BeforeRead()
  beforeRead(options: RepositoryFindOptions<AuthorFixture>) {
    return { ...options, ctx: GLOBEX };
  }
}

@Module({
  imports: [RepositoryModule.forFeature([AUTHOR_TOKEN, POST_TOKEN])],
  providers: [AuthorRowScopeFixture, PostRowScopeFixture],
  exports: [AuthorRowScopeFixture, PostRowScopeFixture],
})
class ResolverModule {}

interface Setup {
  /** The entity registered as authors. */
  authorEntity?: Type;
  maxKeys?: number;
  relations?: Record<string, RelationConfig>;
  scoped?: 'both' | 'posts';
  omit?: string[];
  /** Registered besides the usual entities. */
  extra?: RepositoryProviderOptions[];
  allowEagerRelations?: boolean;
  /** Hooks registered on authors. */
  hooks?: Type[];
  /** Hooks registered on posts. */
  postHooks?: Type[];
}

async function compile({
  authorEntity = AuthorEntityFixture,
  maxKeys,
  relations = FEDERATED,
  scoped,
  omit = [],
  extra = [],
  allowEagerRelations,
  hooks,
  postHooks,
}: Setup = {}): Promise<TestingModule> {
  const hookClasses = [...(hooks ?? []), ...(postHooks ?? [])];
  const entities: RepositoryProviderOptions[] = [
    {
      key: AUTHOR_TOKEN,
      entity: authorEntity,
      relations,
      allowEagerRelations,
      hooks,
      rowScope:
        scoped === 'both'
          ? { access: 'scoped', resolver: AuthorRowScopeFixture }
          : undefined,
    },
    {
      key: POST_TOKEN,
      entity: PostEntityFixture,
      hooks: postHooks,
      rowScope: scoped
        ? { access: 'scoped', resolver: PostRowScopeFixture }
        : undefined,
    },
    { key: PROFILE_TOKEN, entity: ProfileEntityFixture },
    { key: COMPANY_TOKEN, entity: CompanyEntityFixture },
    { key: TAG_TOKEN, entity: TagEntityFixture },
    { key: AUTHOR_TAG_TOKEN, entity: AuthorTagEntityFixture },
    ...extra,
  ];

  const moduleRef = await Test.createTestingModule({
    providers: hookClasses,
    imports: [
      ...(hookClasses.length ? [CoreModule.forRoot()] : []),
      RepositoryModule.forRoot({
        imports: scoped ? [ResolverModule] : [],
        federation: maxKeys === undefined ? undefined : { maxKeys },
        drivers: [
          {
            driver: MemoryRepositoryModuleFixture,
            entities: entities.filter(({ key }) => !omit.includes(key)),
          },
        ],
      }),
    ],
  }).compile();
  await moduleRef.init();
  return moduleRef;
}

function repositories(moduleRef: TestingModule) {
  return {
    authors: moduleRef.get<MemoryRepositoryFixture<AuthorFixture>>(
      getDynamicRepositoryToken(AUTHOR_TOKEN),
    ),
    posts: moduleRef.get<MemoryRepositoryFixture<PostFixture>>(
      getDynamicRepositoryToken(POST_TOKEN),
    ),
    profiles: moduleRef.get<MemoryRepositoryFixture<ProfileFixture>>(
      getDynamicRepositoryToken(PROFILE_TOKEN),
    ),
    companies: moduleRef.get<MemoryRepositoryFixture<CompanyFixture>>(
      getDynamicRepositoryToken(COMPANY_TOKEN),
    ),
    tags: moduleRef.get<MemoryRepositoryFixture<TagFixture>>(
      getDynamicRepositoryToken(TAG_TOKEN),
    ),
    authorTags: moduleRef.get<MemoryRepositoryFixture<AuthorTagFixture>>(
      getDynamicRepositoryToken(AUTHOR_TAG_TOKEN),
    ),
  };
}

const author = (
  id: string,
  name: string,
  companyId: string | null,
): AuthorFixture => ({ id, tenantId: 'acme', name, companyId });

const post = (
  id: string,
  authorId: string,
  title: string,
  isPublished: boolean,
): PostFixture => ({
  id,
  tenantId: 'acme',
  authorId,
  title,
  published: isPublished,
});

const ANN = author('a1', 'Ann', 'c1');
const BOB = author('a2', 'Bob', 'c1');
const CID = author('a3', 'Cid', 'c1');
const DEE = author('a4', 'Dee', 'c1');
const EVE = author('a5', 'Eve', 'c2');
const FAY = author('a6', 'Fay', null);

const ALPHA = post('p1', 'a1', 'Alpha', true);
const BETA = post('p2', 'a1', 'Beta', false);
const GAMMA = post('p3', 'a3', 'Gamma', true);
const DELTA = post('p4', 'a5', 'Delta', true);
const EPSILON = post('p5', 'a4', 'Epsilon', false);

const ACME_CO: CompanyFixture = { id: 'c1', name: 'Acme Co' };
const OTHER_CO: CompanyFixture = { id: 'c2', name: 'Other Co' };

const ANN_PROFILE: ProfileFixture = { id: 'pr1', authorId: 'a1', bio: 'ann' };
const BOB_PROFILE: ProfileFixture = { id: 'pr2', authorId: 'a2', bio: 'bob' };

const TS: TagFixture = { id: 't1', label: 'ts' };
const GO: TagFixture = { id: 't2', label: 'go' };

async function seed(moduleRef: TestingModule): Promise<void> {
  const repos = repositories(moduleRef);
  await repos.companies.createMany([ACME_CO, OTHER_CO]);
  await repos.authors.createMany([ANN, BOB, CID, DEE, EVE, FAY]);
  await repos.posts.createMany([ALPHA, BETA, GAMMA, DELTA, EPSILON]);
  await repos.profiles.createMany([ANN_PROFILE, BOB_PROFILE]);
  await repos.tags.createMany([TS, GO]);
  await repos.authorTags.createMany([
    { id: 'at1', authorId: 'a1', tagId: 't1' },
    { id: 'at2', authorId: 'a3', tagId: 't1' },
    { id: 'at3', authorId: 'a3', tagId: 't2' },
  ]);
}

describe('federated relations', () => {
  let moduleRef: TestingModule;

  afterEach(async () => {
    await moduleRef?.close();
  });

  async function seeded(setup: Setup = {}) {
    moduleRef = await compile(setup);
    await seed(moduleRef);
    return repositories(moduleRef);
  }

  describe('joins', () => {
    it('attaches each to-many relation, [] where there is none', async () => {
      const { authors } = await seeded();

      const rows = await authors.find({
        where: Where.in('id', ['a1', 'a2']),
        join: [{ relation: 'posts' }],
        order: [{ field: 'name', order: 'ASC' }],
      });

      expect(rows).toEqual([
        { ...ANN, posts: [ALPHA, BETA] },
        { ...BOB, posts: [] },
      ]);
    });

    it('reads through the repository registered for the related entity, whatever store it is in', async () => {
      const { authors } = await seeded({
        relations: { remotePosts: { federated: true } },
      });

      const [rows, total] = await authors.findAndCount({
        where: Where.rel('remotePosts', Where.eq('published', true)),
        join: [{ relation: 'remotePosts' }],
        order: [{ field: 'name', order: 'ASC' }],
      });

      expect(rows).toEqual([
        { ...ANN, remotePosts: [ALPHA] },
        { ...CID, remotePosts: [GAMMA] },
        { ...EVE, remotePosts: [DELTA] },
      ]);
      expect(total).toBe(3);
    });

    it('attaches a to-one held by the related row, null where there is none', async () => {
      const { authors } = await seeded();

      const rows = await authors.find({
        where: Where.in('id', ['a1', 'a3']),
        join: [{ relation: 'profile' }],
        order: [{ field: 'name', order: 'ASC' }],
      });

      expect(rows).toEqual([
        { ...ANN, profile: ANN_PROFILE },
        { ...CID, profile: null },
      ]);
    });

    it('refuses a to-one that more than one related row points at', async () => {
      const { authors, profiles } = await seeded();
      await profiles.create({ id: 'pr3', authorId: 'a1', bio: 'again' });

      await expect(
        authors.findOne({
          where: Where.eq('id', 'a1'),
          join: [{ relation: 'profile' }],
        }),
      ).rejects.toMatchObject({
        fault: 'internal',
        message:
          'Relation "profile" is to-one, but 2 Profile rows point at the same row',
      });
    });

    it('attaches a to-one held by the root, null where its key is null', async () => {
      const { authors } = await seeded();

      const rows = await authors.find({
        where: Where.in('id', ['a1', 'a6']),
        join: [{ relation: 'company' }],
        order: [{ field: 'name', order: 'ASC' }],
      });

      expect(rows).toEqual([
        { ...ANN, company: ACME_CO },
        { ...FAY, company: null },
      ]);
    });

    it('attaches a many-to-many through its junction', async () => {
      const { authors } = await seeded();

      const rows = await authors.find({
        where: Where.in('id', ['a2', 'a3']),
        join: [{ relation: 'tags' }],
        order: [{ field: 'name', order: 'ASC' }],
      });

      expect(rows).toEqual([
        { ...BOB, tags: [] },
        { ...CID, tags: [TS, GO] },
      ]);
    });

    it('joins on findOne and findAndCount, and count ignores it', async () => {
      const { authors } = await seeded();
      const join = [{ relation: 'posts' }];

      expect(
        await authors.findOne({ where: Where.eq('id', 'a3'), join }),
      ).toEqual({ ...CID, posts: [GAMMA] });
      expect(
        await authors.findAndCount({
          where: Where.eq('companyId', 'c2'),
          join,
        }),
      ).toEqual([[{ ...EVE, posts: [DELTA] }], 1]);
      expect(await authors.count({ join })).toBe(6);
    });

    it('applies the relation distinctFilter to the rows it attaches', async () => {
      const { authors } = await seeded({
        relations: {
          posts: {
            federated: true,
            distinctFilter: Where.eq('published', true),
          },
        },
      });

      expect(
        await authors.findOne({
          where: Where.eq('id', 'a1'),
          join: [{ relation: 'posts' }],
        }),
      ).toEqual({ ...ANN, posts: [ALPHA] });
    });

    it('reads only its own store when no federated relation is joined', async () => {
      const { authors, posts } = await seeded();
      const find = vi.spyOn(posts, 'find');

      expect(
        await authors.find({
          where: Where.eq('companyId', 'c1'),
          order: [{ field: 'name', order: 'DESC' }],
          take: 2,
        }),
      ).toEqual([DEE, CID]);
      expect(await authors.find({ where: Where.eq('name', 'Nobody') })).toEqual(
        [],
      );
      expect(find).not.toHaveBeenCalled();
    });

    it('hands the driver its ordinary joins and keeps the federated ones', async () => {
      const { authors } = await seeded({
        relations: { posts: { federated: true } },
      });

      // The memory driver refuses every join, after recording the query.
      await expect(
        authors.find({
          join: [{ relation: 'profile' }, { relation: 'posts' }],
        }),
      ).rejects.toThrow('Error while trying to query the authors repository');
      expect(authors.queries.at(-1)?.join).toEqual([{ relation: 'profile' }]);
    });

    it('attaches relations of every kind in one read', async () => {
      const { authors } = await seeded();

      const rows = await authors.find({
        where: Where.in('id', ['a1', 'a6']),
        join: [
          { relation: 'posts' },
          { relation: 'profile' },
          { relation: 'company' },
          { relation: 'tags' },
        ],
        order: [{ field: 'name', order: 'ASC' }],
      });

      expect(rows).toEqual([
        {
          ...ANN,
          posts: [ALPHA, BETA],
          profile: ANN_PROFILE,
          company: ACME_CO,
          tags: [TS],
        },
        { ...FAY, posts: [], profile: null, company: null, tags: [] },
      ]);
    });

    it('reads no related rows when no root matches', async () => {
      const { authors, posts } = await seeded();
      const find = vi.spyOn(posts, 'find');

      expect(
        await authors.find({
          where: Where.eq('name', 'Nobody'),
          join: [{ relation: 'posts' }],
        }),
      ).toEqual([]);
      expect(find).not.toHaveBeenCalled();
    });
  });

  describe('filters', () => {
    const query = (skip: number) => ({
      where: Where.and(Where.eq('companyId', 'c1'), published),
      join: [{ relation: 'posts' }],
      order: [{ field: 'name', order: 'ASC' as const }],
      take: 1,
      skip,
    });

    it('pages and counts exactly, attaching only the matching rows', async () => {
      const { authors } = await seeded();

      // Company c1 has four authors; Ann and Cid have a published post.
      expect(await authors.findAndCount(query(0))).toEqual([
        [{ ...ANN, posts: [ALPHA] }],
        2,
      ]);
      expect(await authors.findAndCount(query(1))).toEqual([
        [{ ...CID, posts: [GAMMA] }],
        2,
      ]);
      expect(await authors.findAndCount(query(2))).toEqual([[], 2]);
    });

    it('reads the related side when the root side has more than maxKeys rows', async () => {
      // Four c1 authors exceed 3; three published posts do not.
      const { authors, posts } = await seeded({ maxKeys: 3 });
      const find = vi.spyOn(posts, 'find');

      expect(await authors.findAndCount(query(0))).toEqual([
        [{ ...ANN, posts: [ALPHA] }],
        2,
      ]);
      expect(find.mock.calls[0]?.[0]).toEqual({
        select: ['authorId'],
        where: Where.eq('published', true),
        take: 4,
        withDeleted: undefined,
        ctx: undefined,
      });
    });

    it('refuses a filter matching more than maxKeys rows on both sides', async () => {
      const { authors } = await seeded({ maxKeys: 2 });

      await expect(authors.findAndCount(query(0))).rejects.toMatchObject({
        ...REFUSED,
        message:
          'The filter on federated relation "posts" matches more than 2 ' +
          'rows on both sides (federation.maxKeys). Narrow the conditions on ' +
          'the root or on the relation',
      });
    });

    it('filters find, findOne and count the same way', async () => {
      const { authors } = await seeded();
      const join = [{ relation: 'posts' }];

      expect(
        await authors.find({
          where: published,
          join,
          order: [{ field: 'name', order: 'ASC' }],
        }),
      ).toEqual([
        { ...ANN, posts: [ALPHA] },
        { ...CID, posts: [GAMMA] },
        { ...EVE, posts: [DELTA] },
      ]);
      expect(
        await authors.findOne({
          where: Where.rel('posts', Where.eq('title', 'Gamma')),
          join,
        }),
      ).toEqual({ ...CID, posts: [GAMMA] });
      expect(await authors.count({ where: published, join })).toBe(3);
    });

    it('combines filters on two federated relations', async () => {
      const { authors } = await seeded();

      const rows = await authors.find({
        where: Where.and(published, Where.rel('tags', Where.eq('label', 'go'))),
        join: [{ relation: 'posts' }, { relation: 'tags' }],
      });

      expect(rows).toEqual([{ ...CID, posts: [GAMMA], tags: [GO] }]);
    });

    it('filters through a to-one held by the root', async () => {
      const { authors } = await seeded();

      const rows = await authors.find({
        where: Where.rel('company', Where.eq('name', 'Other Co')),
        join: [{ relation: 'company' }],
      });

      expect(rows).toEqual([{ ...EVE, company: OTHER_CO }]);
    });

    it('allows an OR within one relation', async () => {
      const { authors } = await seeded();

      const rows = await authors.find({
        where: Where.or(
          Where.rel('posts', Where.eq('title', 'Alpha')),
          Where.rel('posts', Where.eq('title', 'Delta')),
        ),
        join: [{ relation: 'posts' }],
        order: [{ field: 'name', order: 'ASC' }],
      });

      expect(rows).toEqual([
        { ...ANN, posts: [ALPHA] },
        { ...EVE, posts: [DELTA] },
      ]);
    });

    it('leaves out soft-deleted related rows unless withDeleted', async () => {
      const { authors, posts } = await seeded();
      await posts.softDelete(GAMMA);

      expect(
        await authors.count({
          where: published,
          join: [{ relation: 'posts' }],
        }),
      ).toBe(2);
      expect(
        await authors.count({
          where: published,
          join: [{ relation: 'posts' }],
          withDeleted: true,
        }),
      ).toBe(3);
    });

    it('reads nothing under a never clause, with or without a federated filter', async () => {
      // Row scope narrows an empty scope to Where.never().
      const { authors } = await seeded();
      const join = [{ relation: 'posts' }];

      for (const where of [
        Where.never(),
        Where.and(Where.never(), published),
      ]) {
        expect(await authors.findAndCount({ where, join })).toEqual([[], 0]);
        expect(await authors.count({ where, join })).toBe(0);
      }
    });

    it.each([
      ['the root side', undefined],
      ['the related side', 1],
    ])(
      'narrows a filter on a federated relation by its distinctFilter, from %s',
      async (_side, maxKeys) => {
        const { authors } = await seeded({
          maxKeys,
          relations: {
            posts: {
              federated: true,
              distinctFilter: Where.eq('published', true),
            },
          },
        });
        const join = [{ relation: 'posts' }];

        // Beta exists, but is not published.
        expect(
          await authors.count({
            where: Where.rel('posts', Where.eq('title', 'Beta')),
            join,
          }),
        ).toBe(0);
        expect(
          await authors.find({
            where: Where.rel('posts', Where.eq('title', 'Alpha')),
            join,
          }),
        ).toEqual([{ ...ANN, posts: [ALPHA] }]);
      },
    );

    it('counts a root once however many of its related rows match', async () => {
      const { authors } = await seeded();
      const where = Where.rel('posts', Where.ne('title', 'Gamma'));
      const join = [{ relation: 'posts' }];

      // Ann matches through both Alpha and Beta.
      expect(await authors.count({ where, join })).toBe(3);
      expect(
        await authors.findAndCount({
          where,
          join,
          order: [{ field: 'name', order: 'ASC' }],
          take: 1,
        }),
      ).toEqual([[{ ...ANN, posts: [ALPHA, BETA] }], 3]);
    });

    it('applies every condition on one relation to the same related row', async () => {
      const { authors } = await seeded();

      const rows = await authors.find({
        where: Where.and(
          published,
          Where.rel('posts', Where.ne('title', 'Alpha')),
        ),
        join: [{ relation: 'posts' }],
        order: [{ field: 'name', order: 'ASC' }],
      });

      // Ann's only other post, Beta, is not published.
      expect(rows).toEqual([
        { ...CID, posts: [GAMMA] },
        { ...EVE, posts: [DELTA] },
      ]);
    });

    it('splits a nested AND like a flat one', async () => {
      const { authors } = await seeded();

      const rows = await authors.find({
        where: Where.and(
          Where.and(published, Where.rel('tags', Where.eq('label', 'go'))),
          Where.eq('companyId', 'c1'),
        ),
        join: [{ relation: 'posts' }, { relation: 'tags' }],
      });

      expect(rows).toEqual([{ ...CID, posts: [GAMMA], tags: [GO] }]);
    });

    it('narrows to roots with a related row through notNull', async () => {
      const { authors } = await seeded();
      const where = Where.rel('posts', Where.notNull('id'));
      const join = [{ relation: 'posts' }];

      expect(await authors.count({ where, join })).toBe(4);
      expect(
        (
          await authors.find({
            where,
            join,
            order: [{ field: 'name', order: 'ASC' }],
          })
        ).map((row) => row.id),
      ).toEqual(['a1', 'a3', 'a4', 'a5']);
    });

    it('returns nothing when no related row matches', async () => {
      const { authors } = await seeded();
      const none = Where.rel('posts', Where.eq('title', 'Nope'));
      const join = [{ relation: 'posts' }];

      expect(await authors.findAndCount({ where: none, join })).toEqual([
        [],
        0,
      ]);
      expect(await authors.findOne({ where: none, join })).toBeNull();
      expect(await authors.count({ where: none, join })).toBe(0);
    });

    it('filters a many-to-many from the related side', async () => {
      // Six authors exceed 3; one "go" tag with one link does not.
      const { authors } = await seeded({ maxKeys: 3 });

      const rows = await authors.find({
        where: Where.rel('tags', Where.eq('label', 'go')),
        join: [{ relation: 'tags' }],
      });

      expect(rows).toEqual([{ ...CID, tags: [GO] }]);
    });

    it('checks a broad filter against the roots a narrow one leaves', async () => {
      // Posts other than Gamma (4) exceed 2; the "ts" tag's two links do not.
      // Ann and Cid carry the tag, but Cid's only post is Gamma.
      const { authors } = await seeded({ maxKeys: 2 });

      const rows = await authors.find({
        where: Where.and(
          Where.rel('posts', Where.ne('title', 'Gamma')),
          Where.rel('tags', Where.eq('label', 'ts')),
        ),
        join: [{ relation: 'posts' }, { relation: 'tags' }],
      });

      expect(rows).toEqual([{ ...ANN, posts: [ALPHA, BETA], tags: [TS] }]);
    });

    it('refuses when the roots a narrow filter leaves still exceed maxKeys', async () => {
      // One company matches, but it has four authors, and published posts (3)
      // exceed 2 as well.
      const { authors } = await seeded({ maxKeys: 2 });

      await expect(
        authors.find({
          where: Where.and(
            Where.rel('company', Where.eq('name', 'Acme Co')),
            published,
          ),
          join: [{ relation: 'company' }, { relation: 'posts' }],
        }),
      ).rejects.toMatchObject({
        ...REFUSED,
        message:
          'The filter on federated relation "posts" matches more than 2 ' +
          'rows on both sides (federation.maxKeys). Narrow the conditions on ' +
          'the root or on the relation',
      });
    });

    it('reads with a select that includes the column the relation is read by', async () => {
      const { authors } = await seeded();

      const rows = await authors.find({
        select: ['id', 'name'],
        where: Where.rel('posts', Where.eq('title', 'Gamma')),
        join: [{ relation: 'posts' }],
      });

      expect(rows).toEqual([{ id: 'a3', name: 'Cid', posts: [GAMMA] }]);
    });

    it('counts with a select that leaves out the column the relation is read by', async () => {
      const { authors } = await seeded();

      expect(
        await authors.count({
          select: ['name'],
          where: published,
          join: [{ relation: 'posts' }],
        }),
      ).toBe(3);
    });

    it('refuses to attach to more than maxKeys roots at once', async () => {
      const { authors } = await seeded({ maxKeys: 2 });

      await expect(
        authors.find({ join: [{ relation: 'posts' }] }),
      ).rejects.toMatchObject({
        ...REFUSED,
        message:
          'Reading federated relation "posts" needs 6 keys in one query, ' +
          'over the limit of 2 (federation.maxKeys). Read fewer rows at once',
      });
    });

    it.each([
      ['attaches', { where: Where.eq('id', 'a3') }],
      [
        'filters',
        {
          where: Where.and(
            Where.eq('id', 'a3'),
            Where.rel('tags', Where.eq('label', 'go')),
          ),
        },
      ],
    ])(
      'refuses a many-to-many that %s more than maxKeys linked rows',
      async (_case, options) => {
        // Cid alone links to two tags.
        const { authors } = await seeded({ maxKeys: 1 });

        await expect(
          authors.findOne({ ...options, join: [{ relation: 'tags' }] }),
        ).rejects.toMatchObject({
          ...REFUSED,
          message:
            'The rows read link to 2 Tag rows through federated relation ' +
            '"tags", over the limit of 1 (federation.maxKeys). Raise ' +
            'federation.maxKeys, or read fewer rows at once',
        });
      },
    );
  });

  describe('refusals', () => {
    it.each([
      [
        'an OR across the root and a federated relation',
        {
          where: Where.or(Where.eq('name', 'Bob'), published),
          join: [{ relation: 'posts' }],
        },
        'Cannot combine federated relation "posts" with other conditions ' +
          'under OR: it is read from its own repository. Combine them with ' +
          'AND, or keep an OR within the one relation',
      ],
      [
        'isNull on a federated relation',
        {
          where: Where.rel('profile', Where.isNull('bio')),
          join: [{ relation: 'profile' }],
        },
        'Cannot filter federated relation "profile" with isNull: it is read ' +
          'from its own repository, which cannot see a row with no ' +
          '"profile" at all. Filter on a value it has instead',
      ],
      [
        'a sort by a federated relation',
        {
          order: [{ field: 'title', order: 'ASC' as const, relation: 'posts' }],
          join: [{ relation: 'posts' }],
        },
        'Cannot sort Author by federated relation "posts": it is read from ' +
          'its own repository. Sort by a column of Author',
      ],
      [
        'a sort by a federated to-one the entity holds',
        {
          order: [
            { field: 'name', order: 'ASC' as const, relation: 'company' },
          ],
          join: [{ relation: 'company' }],
        },
        'Cannot sort Author by federated relation "company": it is read from ' +
          'its own repository. Sort by a column of Author',
      ],
      [
        'a select without the column a federated join is read by',
        {
          select: ['name' as const],
          join: [{ relation: 'posts' }],
        },
        'Cannot join federated relation "posts" without selecting "id", the ' +
          'column of Author it is read by',
      ],
    ])('refuses %s', async (_case, options, message) => {
      const { authors } = await seeded();

      await expect(authors.find(options)).rejects.toMatchObject({
        ...REFUSED,
        message,
      });
    });
  });

  describe('row scope', () => {
    it('reads related rows under the ctx the call arrived with, not one a hook swapped in', async () => {
      moduleRef = await compile({ scoped: 'posts', hooks: [SwapsCtxHook] });
      const { authors, posts } = repositories(moduleRef);
      await authors.createMany([ANN]);
      await posts.create(
        { id: 'p1', authorId: 'a1', title: 'A', published: true },
        { ctx: ACME },
      );
      await posts.create(
        { id: 'p2', authorId: 'a1', title: 'B', published: true },
        { ctx: GLOBEX },
      );

      const rows = await authors.find({
        join: [{ relation: 'posts' }],
        ctx: ACME,
      });

      expect(rows).toEqual([
        {
          ...ANN,
          posts: [
            {
              id: 'p1',
              tenantId: 'acme',
              authorId: 'a1',
              title: 'A',
              published: true,
            },
          ],
        },
      ]);
    });

    it('filters on related rows under the ctx the call arrived with', async () => {
      moduleRef = await compile({ scoped: 'posts', hooks: [SwapsCtxHook] });
      const { authors, posts } = repositories(moduleRef);
      await authors.createMany([ANN]);
      // Only another tenant's post is published.
      await posts.create(
        { id: 'p1', authorId: 'a1', title: 'A', published: false },
        { ctx: ACME },
      );
      await posts.create(
        { id: 'p2', authorId: 'a1', title: 'B', published: true },
        { ctx: GLOBEX },
      );

      expect(
        await authors.count({
          where: published,
          join: [{ relation: 'posts' }],
          ctx: ACME,
        }),
      ).toBe(0);
    });

    it('refuses a read whose row scope a hook redefined on its ctx', async () => {
      moduleRef = await compile({
        scoped: 'posts',
        hooks: [RedefinesScopeHook],
      });
      const { authors } = repositories(moduleRef);
      await authors.createMany([ANN]);
      const ctx = new AppContextHost();
      ctx.defineOverlay(RowScopeCtx, { tenantId: 'acme' });

      await expect(
        authors.find({ join: [{ relation: 'posts' }], ctx }),
      ).rejects.toMatchObject({
        fault: 'usage',
        message:
          'A hook changed the row scope on the ctx of a read of Author, so ' +
          'its federated relations cannot be read under it. Define ' +
          'RowScopeCtx with { immutable: true }',
      });
    });

    it('refuses a related read after a related hook redefined the row scope', async () => {
      // maxKeys 1 sends the filter to the related side: posts are read first,
      // and the hook redefines the scope before profiles are read.
      moduleRef = await compile({
        scoped: 'posts',
        maxKeys: 1,
        postHooks: [RedefinesScopeHook],
      });
      const { authors, posts, profiles } = repositories(moduleRef);
      await authors.createMany([ANN, BOB]);
      await profiles.createMany([ANN_PROFILE, BOB_PROFILE]);
      const ctx = new AppContextHost();
      ctx.defineOverlay(RowScopeCtx, { tenantId: 'acme' });
      await posts.create(
        { id: 'p1', authorId: 'a1', title: 'A', published: true },
        { ctx: ACME },
      );
      await posts.create(
        { id: 'p2', authorId: 'a1', title: 'B', published: true },
        { ctx: ACME },
      );

      await expect(
        authors.count({
          where: Where.and(
            published,
            Where.rel('profile', Where.eq('bio', 'ann')),
          ),
          join: [{ relation: 'posts' }, { relation: 'profile' }],
          ctx,
        }),
      ).rejects.toMatchObject({
        fault: 'usage',
        message:
          'A hook changed the row scope on the ctx of a read of Author, so ' +
          'its federated relations cannot be read under it. Define ' +
          'RowScopeCtx with { immutable: true }',
      });
    });

    it('refuses allowEagerRelations with a federated relation into scoped rows', async () => {
      await expect(
        compile({ scoped: 'posts', allowEagerRelations: true }),
      ).rejects.toThrow(
        new RepositoryBootException([
          '"authors" allows eager relations, but "posts", "profile", ' +
            '"company", "tags" are federated, which an eager load would read ' +
            "from Author's own store instead of its repository. Remove " +
            'allowEagerRelations from "authors" in forRoot().',
        ]),
      );
    });

    it('counts only roots in scope with related rows in scope', async () => {
      moduleRef = await compile({ scoped: 'both' });
      const { authors, posts } = repositories(moduleRef);
      await authors.create({ id: 'a1', name: 'Ann' }, { ctx: ACME });
      await authors.create({ id: 'a2', name: 'Bob' }, { ctx: ACME });
      await authors.create({ id: 'g1', name: 'Gus' }, { ctx: GLOBEX });
      await authors.create({ id: 'g2', name: 'Gil' }, { ctx: GLOBEX });
      await posts.create(
        { id: 'p1', authorId: 'a1', title: 'A', published: true },
        { ctx: ACME },
      );
      // A globex post naming an acme author is not acme's to see.
      await posts.create(
        { id: 'p2', authorId: 'a2', title: 'B', published: true },
        { ctx: GLOBEX },
      );
      await posts.create(
        { id: 'p3', authorId: 'g1', title: 'C', published: true },
        { ctx: GLOBEX },
      );
      await posts.create(
        { id: 'p4', authorId: 'g2', title: 'D', published: true },
        { ctx: GLOBEX },
      );

      const [rows, total] = await authors.findAndCount({
        where: published,
        join: [{ relation: 'posts' }],
        ctx: ACME,
      });

      expect(rows.map((row) => row.id)).toEqual(['a1']);
      expect(total).toBe(1);
    });

    it('allows an unscoped entity a federated relation into scoped rows', async () => {
      moduleRef = await compile({ scoped: 'posts' });
      const { authors, posts } = repositories(moduleRef);
      await authors.createMany([ANN, BOB]);
      await posts.create(
        { id: 'p1', authorId: 'a1', title: 'A', published: true },
        { ctx: ACME },
      );
      await posts.create(
        { id: 'p2', authorId: 'a2', title: 'B', published: true },
        { ctx: GLOBEX },
      );

      const rows = await authors.find({
        join: [{ relation: 'posts' }],
        order: [{ field: 'name', order: 'ASC' }],
        ctx: ACME,
      });

      expect(rows).toEqual([
        {
          ...ANN,
          posts: [
            {
              id: 'p1',
              tenantId: 'acme',
              authorId: 'a1',
              title: 'A',
              published: true,
            },
          ],
        },
        { ...BOB, posts: [] },
      ]);
    });
  });

  describe('startup', () => {
    it.each([
      [
        'a relation the entity does not have',
        { relations: { books: { federated: true } } },
        '"authors" configures relations.books, but Author has no relation "books".',
      ],
      [
        'a distinctFilter on a relation that is not federated',
        {
          relations: { posts: { distinctFilter: Where.eq('published', true) } },
        },
        '"authors" sets a distinctFilter on relation "posts", which only ' +
          'applies to a federated relation. Set federated: true, or remove it.',
      ],
      [
        'a distinctFilter tagged with a relation',
        {
          relations: {
            posts: {
              federated: true,
              distinctFilter: Where.rel('posts', Where.eq('published', true)),
            },
          },
        },
        '"authors" relation "posts" has a distinctFilter tagged with ' +
          'relation "posts". Write it on the related entity\'s own columns, ' +
          'without a relation.',
      ],
      [
        'a distinctFilter on a column the target lacks',
        {
          relations: {
            posts: {
              federated: true,
              distinctFilter: Where.eq('isPrimary', true),
            },
          },
        },
        '"authors" relation "posts" has a distinctFilter on "isPrimary", ' +
          'which is not a column of Post.',
      ],
      [
        'a federated relation whose target is not registered',
        { omit: [POST_TOKEN] },
        '"authors" relation "posts" is federated, but no repository for ' +
          'Post is registered in forRoot().',
      ],
      [
        'a federated relation whose target is registered twice',
        {
          relations: { posts: { federated: true } },
          extra: [{ key: 'archivedPosts', entity: ArchivedPostEntityFixture }],
        },
        '"authors" relation "posts" is federated, but Post is registered as ' +
          '"posts" and "archivedPosts", so which one to read through is ' +
          'ambiguous.',
      ],
      [
        'a federated many-to-many whose junction is not registered',
        { omit: [AUTHOR_TAG_TOKEN] },
        '"authors" relation "tags" is a federated many-to-many, but no ' +
          'repository for its junction is registered in forRoot(). Register ' +
          'an entity for the junction table.',
      ],
      [
        'allowEagerRelations on an entity with a federated relation',
        {
          relations: { posts: { federated: true } },
          allowEagerRelations: true,
        },
        '"authors" allows eager relations, but "posts" is federated, which ' +
          "an eager load would read from Author's own store instead of its " +
          'repository. Remove allowEagerRelations from "authors" in forRoot().',
      ],
      [
        'a federated relation whose columns differ from its repository',
        {
          authorEntity: DriftedAuthorEntityFixture,
          relations: { staleProfile: { federated: true } },
        },
        '"authors" relation "staleProfile" is federated, but its columns of ' +
          'Profile differ from the "profiles" repository\'s: bio. Define both ' +
          'entities with the same columns.',
      ],
      [
        'a federated relation with a column its repository lacks',
        {
          authorEntity: DriftedAuthorEntityFixture,
          relations: { newerProfile: { federated: true } },
        },
        '"authors" relation "newerProfile" is federated, but its columns of ' +
          'Profile differ from the "profiles" repository\'s: avatar. Define ' +
          'both entities with the same columns.',
      ],
      [
        'a federated relation read by a column its target lacks',
        {
          authorEntity: DriftedAuthorEntityFixture,
          relations: { profileByOwner: { federated: true } },
        },
        '"authors" relation "profileByOwner" reads Profile by "ownerId", ' +
          'which is not a column of the "profiles" repository.',
      ],
      [
        'a federated relation read by a column the entity lacks',
        {
          authorEntity: DriftedAuthorEntityFixture,
          relations: { profileByHandle: { federated: true } },
        },
        '"authors" relation "profileByHandle" is read by "handle", which is ' +
          'not a column of Author.',
      ],
    ])('refuses %s', async (_case, setup: Setup, failure) => {
      await expect(compile(setup)).rejects.toThrow(
        new RepositoryBootException([failure]),
      );
    });

    it('refuses a maxKeys below 1', async () => {
      await expect(compile({ maxKeys: 0 })).rejects.toThrow(
        RepositoryBootException,
      );
    });
  });
});
