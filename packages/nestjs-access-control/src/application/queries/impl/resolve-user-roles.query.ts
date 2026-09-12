import { type ExecutionContext } from '@nestjs/common';
import { Query } from '@nestjs/cqrs';

import { type ResolveUserRolesQueryInterface } from '../../ports/access-control.port.js';

export class ResolveUserRolesQuery
  extends Query<string | string[]>
  implements ResolveUserRolesQueryInterface
{
  constructor(public readonly executionContext: ExecutionContext) {
    super();
  }
}
