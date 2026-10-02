import { Injectable, type PlainLiteralObject } from '@nestjs/common';

import {
  InjectDynamicRepository,
  type RepositoryInterface,
  RowScopeBase,
} from '@concepta/nestjs-repository';

import { ROW_SCOPE_PROFILE_TOKEN } from './row-scope.constants.fixture.js';

/** Configuration only — the default resolver, on a join-column primary key. */
@Injectable()
export class ProfileRowScopeFixture extends RowScopeBase<
  PlainLiteralObject,
  PlainLiteralObject
> {
  constructor(
    @InjectDynamicRepository(ROW_SCOPE_PROFILE_TOKEN)
    profiles: RepositoryInterface<PlainLiteralObject>,
  ) {
    super(profiles, {
      scopeKey: 'tenantId',
      column: 'tenantId',
      label: 'Profile',
    });
  }
}
