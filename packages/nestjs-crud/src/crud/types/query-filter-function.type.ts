import { PlainLiteralObject } from '@nestjs/common';

import { SCondition } from '../../request/types/crud-request-query.types';

export type QueryFilterFunction<T extends PlainLiteralObject> = (
  search?: SCondition<T>,
  getMany?: boolean,
) => SCondition<T> | void;
