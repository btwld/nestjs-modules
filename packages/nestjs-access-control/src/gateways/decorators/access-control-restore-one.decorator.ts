import { type applyDecorators } from '@nestjs/common';

import { ActionEnum } from '@concepta/nestjs-core';

import { AccessControlGrant } from './access-control-grant.decorator.js';

/**
 * Restore one resource grant shortcut: the `restore` action, as CRUD's
 * restore route and the repository's `restore` take.
 *
 * @param resource - The grant resource.
 */
export const AccessControlRestoreOne = (
  resource: string,
): ReturnType<typeof applyDecorators> =>
  AccessControlGrant({ resource, action: ActionEnum.RESTORE });
