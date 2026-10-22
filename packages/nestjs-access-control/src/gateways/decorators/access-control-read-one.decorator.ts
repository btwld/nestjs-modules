import { type applyDecorators } from '@nestjs/common';

import { ActionEnum } from '@concepta/nestjs-core';

import { AccessControlGrant } from './access-control-grant.decorator.js';

/**
 * Read one resource grant shortcut
 *
 * @param resource - The grant resource.
 * @returns Decorator function
 */
export const AccessControlReadOne = (
  resource: string,
): ReturnType<typeof applyDecorators> =>
  AccessControlGrant({
    resource: resource,
    action: ActionEnum.READ,
  });
