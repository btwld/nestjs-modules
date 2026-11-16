import { Injectable, type PlainLiteralObject } from '@nestjs/common';

import { type RepositoryColumnMetadataInterface } from '../../repository/interfaces/repository-column-metadata.interface.js';
import { type RepositoryMetadataInterface } from '../../repository/interfaces/repository-metadata.interface.js';
import { RowScopeBase } from '../../row-scope/row-scope-base.js';

export const PROJECT_TOKEN = 'projects';
export const DRAFT_TOKEN = 'drafts';

/** A caller in a tenant, and the role it holds there. */
export interface UserScopeFixture extends PlainLiteralObject {
  tenantId: string;
  userId: string;
  role?: 'tenant-admin' | 'global-admin';
}

export interface ProjectFixture {
  id: string;
  tenantId: string;
  name: string;
  drafts?: DraftFixture[];
}

export class ProjectEntityFixture implements ProjectFixture {
  declare id: string;
  declare tenantId: string;
  declare name: string;
  declare drafts?: DraftFixture[];
}

export interface DraftFixture {
  id: string;
  tenantId: string;
  userId: string;
  projectId: string;
  title: string;
}

export class DraftEntityFixture implements DraftFixture {
  declare id: string;
  declare tenantId: string;
  declare userId: string;
  declare projectId: string;
  declare title: string;
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

const PROJECT_COLUMNS = [
  column('id', { isPrimary: true }),
  column('tenantId'),
  column('name'),
];

const DRAFT_COLUMNS = [
  column('id', { isPrimary: true }),
  column('tenantId'),
  column('userId'),
  column('projectId'),
  column('title'),
];

/** A project has many drafts, joined on `(tenantId, id)`. */
export const PROJECT_METADATA: RepositoryMetadataInterface<ProjectFixture> = {
  name: 'Project',
  type: ProjectEntityFixture,
  urn: 'urn:memory:Project',
  columns: PROJECT_COLUMNS,
  relations: [
    {
      name: 'drafts',
      targetEntity: 'Draft',
      targetUrn: 'urn:memory:Draft',
      targetColumns: DRAFT_COLUMNS,
      cardinality: 'many',
      on: { from: 'id', to: 'projectId' },
      joinOn: [
        { from: 'tenantId', to: 'tenantId' },
        { from: 'id', to: 'projectId' },
      ],
    },
  ],
};

/** A draft belongs to a project through `(tenantId, projectId)`. */
export const DRAFT_METADATA: RepositoryMetadataInterface<DraftFixture> = {
  name: 'Draft',
  type: DraftEntityFixture,
  urn: 'urn:memory:Draft',
  columns: DRAFT_COLUMNS,
  relations: [
    {
      name: 'project',
      targetEntity: 'Project',
      targetUrn: 'urn:memory:Project',
      targetColumns: PROJECT_COLUMNS,
      cardinality: 'one',
      on: { from: 'projectId', to: 'id' },
      joinOn: [
        { from: 'tenantId', to: 'tenantId' },
        { from: 'projectId', to: 'id' },
      ],
      foreignKey: [
        { from: 'tenantId', to: 'tenantId' },
        { from: 'projectId', to: 'id' },
      ],
    },
  ],
};

/** Projects belong to a tenant; a global admin reads every tenant's. */
@Injectable()
export class ProjectRowScopeFixture extends RowScopeBase<UserScopeFixture> {
  constructor() {
    super({
      scope: ['tenantId'],
      joinable: true,
      relax: (scope) => (scope.role === 'global-admin' ? ['tenantId'] : []),
    });
  }
}

/** Projects belong to a tenant, for every caller. */
@Injectable()
export class StrictProjectRowScopeFixture extends RowScopeBase<UserScopeFixture> {
  constructor() {
    super({ scope: ['tenantId'], joinable: true });
  }
}

/**
 * Drafts belong to a user in a tenant; a tenant admin reads the whole tenant's,
 * a global admin every tenant's.
 */
@Injectable()
export class DraftRowScopeFixture extends RowScopeBase<UserScopeFixture> {
  constructor() {
    super({
      scope: ['tenantId', 'userId'],
      joinable: true,
      relax: (scope) => {
        switch (scope.role) {
          case 'global-admin':
            return ['tenantId', 'userId'];
          case 'tenant-admin':
            return ['userId'];
          default:
            return [];
        }
      },
    });
  }
}
