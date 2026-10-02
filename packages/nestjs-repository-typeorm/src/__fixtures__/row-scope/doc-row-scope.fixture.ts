import { Injectable, type PlainLiteralObject } from '@nestjs/common';

import {
  InjectDynamicRepository,
  type RepositoryInterface,
  RowScopeBase,
} from '@concepta/nestjs-repository';

import { ROW_SCOPE_DOC_TOKEN } from './row-scope.constants.fixture.js';

/**
 * The plainest possible resolver: configuration only, no overrides.
 *
 * This is the shape the README leads with, and the only fixture that exercises
 * the **default** `resolveScope` end to end — the other two override it for
 * their cross-tenant read bypass.
 */
@Injectable()
export class DocRowScopeFixture extends RowScopeBase<
  PlainLiteralObject,
  PlainLiteralObject
> {
  constructor(
    @InjectDynamicRepository(ROW_SCOPE_DOC_TOKEN)
    docs: RepositoryInterface<PlainLiteralObject>,
  ) {
    super(docs, { scopeKey: 'tenantId', column: 'tenantId', label: 'Doc' });
  }
}
