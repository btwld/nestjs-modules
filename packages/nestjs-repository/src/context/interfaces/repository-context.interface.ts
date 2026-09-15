import { type PlainLiteralObject } from '@nestjs/common';

import { OverlayRef } from '@concepta/nestjs-core';

/**
 * Context interface for the entity routing overlay.
 *
 * Returned by the `withRepo()` overlay method. Identifies which
 * entity key is in scope for hooks and repository operations.
 */
export interface RepositoryContextInterface extends PlainLiteralObject {
  entity: string;
}

export const RepoCtx = new OverlayRef<'withRepo', RepositoryContextInterface>(
  'withRepo',
);
