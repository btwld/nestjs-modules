import { applyDecorators } from '@nestjs/common';

import { ActionEnum } from '../enums/action.enum';

import { AccessControlGrant } from './access-control-grant.decorator';

/**
 * Create one resource grant shortcut.
 *
 * @param resource - The grant resource.
 * @returns Decorator function
 */
export const AccessControlCreateOne = (
  resource: string,
): ReturnType<typeof applyDecorators> =>
  AccessControlGrant({
    resource: resource,
    action: ActionEnum.CREATE,
  });
