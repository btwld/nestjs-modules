import { type PlainLiteralObject } from '@nestjs/common';

import { type WhereCondition } from '@concepta/nestjs-repository';

import { type SCondition } from './crud-query.types.js';

export type QueryFilterOption<T extends PlainLiteralObject> =
  WhereCondition<T>[] | SCondition<T>;
