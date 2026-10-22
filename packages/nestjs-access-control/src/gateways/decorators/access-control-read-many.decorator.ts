import { type applyDecorators } from '@nestjs/common';

import { ActionEnum } from '@concepta/nestjs-core';

import { AccessControlGrant } from './access-control-grant.decorator.js';

/**
 * Read many resource grant shortcut.
 *
 * @param resource - The grant resource.
 * @returns Decorator function
 */
export const AccessControlReadMany = (
  resource: string,
): ReturnType<typeof applyDecorators> =>
  AccessControlGrant({
    resource: resource,
    action: ActionEnum.READ,
  });
