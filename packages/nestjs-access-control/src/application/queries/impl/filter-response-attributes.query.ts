import { type ExecutionContext } from '@nestjs/common';
import { Query } from '@nestjs/cqrs';

import { type FilterResponseAttributesQueryInterface } from '../../ports/access-control.port.js';

export class FilterResponseAttributesQuery
  extends Query<unknown>
  implements FilterResponseAttributesQueryInterface
{
  constructor(
    public readonly executionContext: ExecutionContext,
    public readonly data: unknown,
  ) {
    super();
  }
}
