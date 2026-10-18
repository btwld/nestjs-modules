import { Injectable, type PlainLiteralObject } from '@nestjs/common';

import { InjectDynamicRepository } from '../../decorators/inject-dynamic-repository.decorator.js';
import { type RepositoryColumnMetadataInterface } from '../../repository/interfaces/repository-column-metadata.interface.js';
import { type RepositoryMetadataInterface } from '../../repository/interfaces/repository-metadata.interface.js';
import { type RepositoryRelationMetadataInterface } from '../../repository/interfaces/repository-relation-metadata.interface.js';
import { type RepositoryInterface } from '../../repository/interfaces/repository.interface.js';
import { RowScopeBase } from '../../row-scope/row-scope-base.js';

import { type TenantScopeFixture } from './order-row-scope.fixture.js';

export const AUTHOR_TOKEN = 'authors';
export const POST_TOKEN = 'posts';
export const PROFILE_TOKEN = 'profiles';
export const COMPANY_TOKEN = 'companies';
export const TAG_TOKEN = 'tags';
export const AUTHOR_TAG_TOKEN = 'author-tags';

export interface AuthorFixture {
  id: string;
  tenantId: string;
  name: string;
  companyId?: string | null;
  dateDeleted?: Date | null;
}

export class AuthorEntityFixture implements AuthorFixture {
  declare id: string;
  declare tenantId: string;
  declare name: string;
  declare companyId?: string | null;
  declare dateDeleted?: Date | null;
}

export interface PostFixture {
  id: string;
  tenantId: string;
  authorId: string;
  title: string;
  published: boolean;
  dateDeleted?: Date | null;
}

export class PostEntityFixture implements PostFixture {
  declare id: string;
  declare tenantId: string;
  declare authorId: string;
  declare title: string;
  declare published: boolean;
  declare dateDeleted?: Date | null;
}

export interface ProfileFixture extends PlainLiteralObject {
  id: string;
  authorId: string;
  bio: string;
}

export class ProfileEntityFixture implements ProfileFixture {
  [key: string]: unknown;
  declare id: string;
  declare authorId: string;
  declare bio: string;
}

export interface CompanyFixture extends PlainLiteralObject {
  id: string;
  name: string;
}

export class CompanyEntityFixture implements CompanyFixture {
  [key: string]: unknown;
  declare id: string;
  declare name: string;
}

export interface TagFixture extends PlainLiteralObject {
  id: string;
  label: string;
}

export class TagEntityFixture implements TagFixture {
  [key: string]: unknown;
  declare id: string;
  declare label: string;
}

export interface AuthorTagFixture extends PlainLiteralObject {
  id: string;
  authorId: string;
  tagId: string;
}

export class AuthorTagEntityFixture implements AuthorTagFixture {
  [key: string]: unknown;
  declare id: string;
  declare authorId: string;
  declare tagId: string;
}

const column = (
  name: string,
  flags: Partial<RepositoryColumnMetadataInterface> = {},
): RepositoryColumnMetadataInterface => ({
  name,
  isPrimary: false,
  isVersion: false,
  isRemoveDate: false,
  ...flags,
});

const AUTHOR_COLUMNS = [
  column('id', { isPrimary: true }),
  column('tenantId'),
  column('name'),
  column('companyId'),
  column('dateDeleted', { isRemoveDate: true }),
];
const POST_COLUMNS = [
  column('id', { isPrimary: true }),
  column('tenantId'),
  column('authorId'),
  column('title'),
  column('published'),
  column('dateDeleted', { isRemoveDate: true }),
];
const PROFILE_COLUMNS = [
  column('id', { isPrimary: true }),
  column('authorId'),
  column('bio'),
];
const COMPANY_COLUMNS = [column('id', { isPrimary: true }), column('name')];
const TAG_COLUMNS = [column('id', { isPrimary: true }), column('label')];
const AUTHOR_TAG_COLUMNS = [
  column('id', { isPrimary: true }),
  column('authorId'),
  column('tagId'),
];

export const AUTHOR_METADATA: RepositoryMetadataInterface<AuthorFixture> = {
  name: 'Author',
  type: AuthorEntityFixture,
  urn: 'urn:memory:Author',
  columns: AUTHOR_COLUMNS,
  relations: [
    {
      name: 'posts',
      targetEntity: 'Post',
      targetUrn: 'urn:memory:Post',
      targetColumns: POST_COLUMNS,
      cardinality: 'many',
      on: { from: 'id', to: 'authorId' },
    },
    {
      // Posts as another store describes them: the same entity, under the
      // URN of that store's own table.
      name: 'remotePosts',
      targetEntity: 'Post',
      targetUrn: 'urn:memory:authors-store:Post',
      targetColumns: POST_COLUMNS,
      cardinality: 'many',
      on: { from: 'id', to: 'authorId' },
    },
    {
      name: 'profile',
      targetEntity: 'Profile',
      targetUrn: 'urn:memory:Profile',
      targetColumns: PROFILE_COLUMNS,
      cardinality: 'one',
      on: { from: 'id', to: 'authorId' },
    },
    {
      name: 'company',
      targetEntity: 'Company',
      targetUrn: 'urn:memory:Company',
      targetColumns: COMPANY_COLUMNS,
      cardinality: 'one',
      on: { from: 'companyId', to: 'id' },
      foreignKey: [{ from: 'companyId', to: 'id' }],
    },
    {
      name: 'tags',
      targetEntity: 'Tag',
      targetUrn: 'urn:memory:Tag',
      targetColumns: TAG_COLUMNS,
      cardinality: 'many',
      on: { from: 'id', to: 'id' },
      through: {
        urn: 'urn:memory:AuthorTag',
        fromKey: 'authorId',
        toKey: 'tagId',
      },
    },
  ],
};

export const POST_METADATA: RepositoryMetadataInterface<PostFixture> = {
  name: 'Post',
  type: PostEntityFixture,
  urn: 'urn:memory:Post',
  columns: POST_COLUMNS,
  relations: [],
};

export const PROFILE_METADATA: RepositoryMetadataInterface<ProfileFixture> = {
  name: 'Profile',
  type: ProfileEntityFixture,
  urn: 'urn:memory:Profile',
  columns: PROFILE_COLUMNS,
  relations: [],
};

export const COMPANY_METADATA: RepositoryMetadataInterface<CompanyFixture> = {
  name: 'Company',
  type: CompanyEntityFixture,
  urn: 'urn:memory:Company',
  columns: COMPANY_COLUMNS,
  relations: [],
};

export const TAG_METADATA: RepositoryMetadataInterface<TagFixture> = {
  name: 'Tag',
  type: TagEntityFixture,
  urn: 'urn:memory:Tag',
  columns: TAG_COLUMNS,
  relations: [],
};

export const AUTHOR_TAG_METADATA: RepositoryMetadataInterface<AuthorTagFixture> =
  {
    name: 'AuthorTag',
    type: AuthorTagEntityFixture,
    urn: 'urn:memory:AuthorTag',
    columns: AUTHOR_TAG_COLUMNS,
    relations: [],
  };

/** Posts kept in an archive: another `Post`, over other rows. */
export class ArchivedPostEntityFixture extends PostEntityFixture {}

export const ARCHIVED_POST_METADATA: RepositoryMetadataInterface<PostFixture> =
  {
    ...POST_METADATA,
    type: ArchivedPostEntityFixture,
    urn: 'urn:memory:archive:Post',
  };

/** An author whose relations disagree with the repository they reach. */
export class DriftedAuthorEntityFixture extends AuthorEntityFixture {}

const profileRelation: Omit<RepositoryRelationMetadataInterface, 'name'> = {
  targetEntity: 'Profile',
  targetUrn: 'urn:memory:Profile',
  targetColumns: PROFILE_COLUMNS,
  cardinality: 'one',
  on: { from: 'id', to: 'authorId' },
};

export const DRIFTED_AUTHOR_METADATA: RepositoryMetadataInterface<AuthorFixture> =
  {
    ...AUTHOR_METADATA,
    type: DriftedAuthorEntityFixture,
    relations: [
      {
        ...profileRelation,
        name: 'staleProfile',
        targetColumns: PROFILE_COLUMNS.filter(({ name }) => name !== 'bio'),
      },
      {
        ...profileRelation,
        name: 'newerProfile',
        targetColumns: [...PROFILE_COLUMNS, column('avatar')],
      },
      {
        ...profileRelation,
        name: 'profileByOwner',
        on: { from: 'id', to: 'ownerId' },
      },
      {
        ...profileRelation,
        name: 'profileByHandle',
        on: { from: 'handle', to: 'authorId' },
      },
    ],
  };

/** Tenant scoping for authors. */
@Injectable()
export class AuthorRowScopeFixture extends RowScopeBase<
  AuthorFixture,
  TenantScopeFixture
> {
  constructor(
    @InjectDynamicRepository(AUTHOR_TOKEN)
    authors: RepositoryInterface<AuthorFixture>,
  ) {
    super(authors, {
      scopeKey: 'tenantId',
      column: 'tenantId',
      label: 'Author',
    });
  }
}

/** Tenant scoping for posts. */
@Injectable()
export class PostRowScopeFixture extends RowScopeBase<
  PostFixture,
  TenantScopeFixture
> {
  constructor(
    @InjectDynamicRepository(POST_TOKEN)
    posts: RepositoryInterface<PostFixture>,
  ) {
    super(posts, { scopeKey: 'tenantId', column: 'tenantId', label: 'Post' });
  }
}
