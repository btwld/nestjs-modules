import { Injectable, type PlainLiteralObject } from '@nestjs/common';

import { RowScopeBase } from '../../row-scope/row-scope-base.js';

/** The scope shape these fixtures put on `RowScopeCtx`. */
export interface TenantScopeFixture extends PlainLiteralObject {
  tenantId: string;
  role?: string;
}

/**
 * Tenant scoping, with every tenant's rows readable by an admin. `relax` widens
 * reads only, never a write.
 */
@Injectable()
export class OrderRowScopeFixture extends RowScopeBase<TenantScopeFixture> {
  constructor() {
    super({
      scope: ['tenantId'],
      joinable: true,
      relax: (scope) => (scope.role === 'admin' ? ['tenantId'] : []),
    });
  }
}

/** Joinable tenant scoping, reading exactly by `tenantId`. */
@Injectable()
export class JoinableTenantRowScopeFixture extends RowScopeBase<TenantScopeFixture> {
  constructor() {
    super({ scope: ['tenantId'], joinable: true });
  }
}

/** A second class, joinable on the same terms. */
@Injectable()
export class OtherJoinableTenantRowScopeFixture extends RowScopeBase<TenantScopeFixture> {
  constructor() {
    super({ scope: ['tenantId'], joinable: true });
  }
}

/** Joinable, but with no scope columns, so it reads nothing. */
@Injectable()
export class NoColumnsRowScopeFixture extends RowScopeBase<TenantScopeFixture> {
  constructor() {
    super({ scope: [], joinable: true });
  }
}

/** Joinable on `tenantId`, but read from another `RowScopeCtx` key. */
@Injectable()
export class OrgRowScopeFixture extends RowScopeBase<TenantScopeFixture> {
  constructor() {
    super({ scope: [{ column: 'tenantId', key: 'orgId' }], joinable: true });
  }
}
