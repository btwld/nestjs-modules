import { Injectable, Module } from '@nestjs/common';

import { RowScopeBase } from '@concepta/nestjs-repository';

import { type RlsPrincipalFixture } from './rls-principal.interface.fixture.js';

/** Projects belong to a tenant. */
@Injectable()
export class RlsProjectRowScopeFixture extends RowScopeBase<RlsPrincipalFixture> {
  constructor() {
    super({ scope: ['tenantId'], joinable: true });
  }
}

/** Tasks belong to a user in a tenant; a tenant admin reads the whole tenant's. */
@Injectable()
export class RlsTaskRowScopeFixture extends RowScopeBase<RlsPrincipalFixture> {
  constructor() {
    super({
      scope: ['tenantId', 'userId'],
      joinable: true,
      relax: (scope) => (scope.role === 'tenant-admin' ? ['userId'] : []),
    });
  }
}

@Module({
  providers: [RlsProjectRowScopeFixture, RlsTaskRowScopeFixture],
  exports: [RlsProjectRowScopeFixture, RlsTaskRowScopeFixture],
})
export class RlsRowScopeModuleFixture {}
