import { type ExecutionContext } from '@nestjs/common';
import { Query } from '@nestjs/cqrs';

import { type CheckAccessQueryInterface } from '../../ports/access-control.port.js';

export class CheckAccessQuery
  extends Query<boolean>
  implements CheckAccessQueryInterface
{
  constructor(public readonly executionContext: ExecutionContext) {
    super();
  }
}
