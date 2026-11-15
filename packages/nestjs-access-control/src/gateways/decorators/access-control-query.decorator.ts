import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';

import { ACCESS_CONTROL_MODULE_QUERY_METADATA } from '../../access-control.constants.js';
import { AccessControlException } from '../../domain/exceptions/access-control.exception.js';
import { type AccessControlQueryOptionInterface } from '../../domain/interfaces/access-control-query-option.interface.js';
import { AccessControlGuard } from '../http/access-control.guard.js';

/**
 * Adds access query services to the route, or to every route of a
 * controller: once a grant lets the call through, it proceeds when one of
 * them allows it. A route's services replace its controller's. A service
 * decides what a grant cannot, such as whether the record a call names is
 * one the caller may act on.
 *
 * Applies the access control guard, which refuses the route if it declares
 * no grant: query services never run on their own.
 *
 * @param queryOptions - Array of access control query options; at least one.
 * @returns Decorator function.
 */
export const AccessControlQuery = (
  ...queryOptions: AccessControlQueryOptionInterface[]
): ReturnType<typeof applyDecorators> => {
  if (!queryOptions.length) {
    throw new AccessControlException({
      message: '@AccessControlQuery needs at least one service',
      fault: 'usage',
    });
  }

  return applyDecorators(
    SetMetadata(ACCESS_CONTROL_MODULE_QUERY_METADATA, queryOptions),
    UseGuards(AccessControlGuard),
  );
};
