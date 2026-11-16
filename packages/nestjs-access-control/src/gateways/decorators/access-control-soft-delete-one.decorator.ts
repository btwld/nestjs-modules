import { type applyDecorators } from '@nestjs/common';

import { ActionEnum } from '@concepta/nestjs-core';

import { AccessControlGrant } from './access-control-grant.decorator.js';

/**
 * Soft delete one resource grant shortcut: the `softDelete` action, as
 * CRUD's soft delete route and the repository's `softDelete` take.
 *
 * @param resource - The grant resource.
 */
export const AccessControlSoftDeleteOne = (
  resource: string,
): ReturnType<typeof applyDecorators> =>
  AccessControlGrant({ resource, action: ActionEnum.SOFT_DELETE });
